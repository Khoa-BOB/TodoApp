"""Build the API first, then run: python3 checks/seed.py

Uses a temporary database and stops each test server automatically.
"""
import base64
import json
import os
import sqlite3
import subprocess
import tempfile
import time
from contextlib import contextmanager
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen

api_dir = Path(__file__).resolve().parents[1]
base_url = "http://127.0.0.1:5141"


@contextmanager
def server(database, environment):
    env = {**os.environ, "ASPNETCORE_ENVIRONMENT": environment,
           "ConnectionStrings__DefaultConnection": f"Data Source={database}",
           "Jwt__Key": "seed-check-only-signing-key-at-least-32-characters",
           "Jwt__Issuer": "TodoApp.Api", "Jwt__Audience": "TodoApp.Client"}
    process = subprocess.Popen(
        ["dotnet", "bin/Debug/net10.0/TodoApp.Api.dll", "--urls", base_url],
        cwd=api_dir, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        for _ in range(80):
            assert process.poll() is None, "API exited before it was ready"
            try:
                with urlopen(f"{base_url}/todos/", timeout=1):
                    break
            except HTTPError as error:
                assert error.code == 401, error.code
                break
            except (URLError, TimeoutError):
                time.sleep(0.25)
        else:
            raise AssertionError("API did not become ready")
        yield
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def login(username, password="ChangeMe123!", expected=200):
    jar = CookieJar()
    session = build_opener(HTTPCookieProcessor(jar))
    with session.open(f"{base_url}/auth/csrf") as response:
        csrf = json.load(response)["csrfToken"]
    request = Request(f"{base_url}/auth/login",
                      data=json.dumps({"Email": username, "Password": password}).encode(),
                      headers={"Content-Type": "application/json", "X-CSRF-TOKEN": csrf})
    try:
        response = session.open(request)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == expected, response.status
        if expected != 200:
            return
        result = json.load(response)
    assert result["role"] == 2 and result["response"] == {"name": "admin", "email": "admin@example.com"}
    token = next(cookie.value for cookie in jar if cookie.name == "access_token")
    payload = token.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    with session.open(f"{base_url}/users/{claims['sub']}") as response:
        assert response.status == 200, "Seeded user must have administrator access"


with tempfile.TemporaryDirectory(prefix="todo-seed-check-") as temp:
    database = Path(temp) / "test.db"
    with server(database, "Development"):
        login("admin")
        login("admin@example.com")
        login(" ADMIN ")
        login("admin", "wrong-password", 401)
        login(None, expected=401)
        with sqlite3.connect(database) as db:
            original = db.execute("SELECT ID, HashedPassword FROM Users WHERE Email = 'admin@example.com'").fetchone()
            assert original and original[1] != "ChangeMe123!"
    with server(database, "Development"):
        with sqlite3.connect(database) as db:
            assert db.execute("SELECT ID, HashedPassword FROM Users").fetchall() == [original], "Restart must not duplicate or reset the seed"
    production_database = Path(temp) / "production.db"
    with server(production_database, "Production"):
        with sqlite3.connect(production_database) as db:
            assert db.execute("SELECT Email, HashedPassword, Role FROM Users").fetchall() == [], "Production must migrate a fresh database without seeding the demo account"
            assert db.execute("SELECT COUNT(*) FROM Todos").fetchone()[0] == 0
            db.execute("INSERT INTO Users (ID, Name, Email, CreatedAt, HashedPassword, Role) VALUES (?, ?, ?, ?, ?, ?)",
                       (original[0], "Existing user", "existing@example.com", "2026-01-01 00:00:00+00:00", original[1], 1))
    with server(production_database, "Production"):
        with sqlite3.connect(production_database) as db:
            assert db.execute("SELECT ID, HashedPassword FROM Users").fetchall() == [original], "Production restart must preserve existing data without seeding the demo account"

print("PASS: admin login/access, hashed password, invalid login, idempotent restart, fresh production migrations, production data preserved, no production seed")
