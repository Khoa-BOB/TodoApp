"""Run against a local API: python3 checks/signup.py http://localhost:5128"""
import base64
import hashlib
import hmac
import json
import sys
import uuid
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen

base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5128"
def send(path, body, expected_status, method="POST", token=None, session=None, csrf=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if path in ("/auth/signup", "/auth/login") and csrf is None:
        session = session or build_opener(HTTPCookieProcessor(CookieJar()))
        with session.open(f"{base_url}/auth/csrf", timeout=10) as response:
            csrf = json.load(response)["csrfToken"]
    if csrf:
        headers["X-CSRF-TOKEN"] = csrf
    request = Request(
        f"{base_url}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
        method=method,
    )
    try:
        response = (session.open if session else urlopen)(request, timeout=10)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == expected_status, (response.status, response.read().decode())
        if path == "/auth/csrf":
            assert "no-store" in response.headers["Cache-Control"]
        raw = response.read()
        return json.loads(raw) if raw else None


email = f"signup-{uuid.uuid4().hex}@example.com"
password = "Test-password-123!"
send("/auth/signup", {"Email": email, "Password": password, "Name": "Signup check"}, 400, csrf="")
send("/auth/signup", {"Email": email, "Password": password, "Name": "Signup check"}, 200)
conflict = send("/auth/signup", {"Email": email.upper(), "Password": password, "Name": "Signup check"}, 409)
assert conflict["title"] == "Email Conflict"
send("/auth/login", {"Email": email, "Password": "wrong-password"}, 401)
jar = CookieJar()
browser = build_opener(HTTPCookieProcessor(jar))
anonymous_csrf = send("/auth/csrf", None, 200, "GET", session=browser)["csrfToken"]
send("/auth/login", {"Email": email, "Password": password}, 400, session=browser, csrf="")
login = send("/auth/login", {"Email": email, "Password": password}, 200, session=browser)
assert "token" not in login
cookie = next(cookie for cookie in jar if cookie.name == "access_token")
assert (cookie.has_nonstandard_attr("HttpOnly") or cookie.has_nonstandard_attr("httponly")) and cookie.path == "/" and cookie.expires
assert (cookie.get_nonstandard_attr("SameSite") or cookie.get_nonstandard_attr("samesite")).lower() == "lax"
token = cookie.value
parts = token.split(".")
assert len(parts) == 3
claims = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4)))
assert claims["iss"] and claims["aud"]
assert claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] == "User"
uuid.UUID(claims["sub"])

assert login["response"] == {"email": email, "name": "Signup check"}
user_path = f"/users/{claims['sub']}"
send(user_path, None, 401, "GET")
send(user_path + "/todos", None, 401, "GET")
send(user_path, None, 403, "GET", token)
send(user_path + "/todos", None, 403, "GET", token)
user_create = {"Name": "Not allowed", "Email": email, "hashedPassword": "test-hash"}
send("/users", user_create, 401)
send("/users", user_create, 403, token=token)
missing_path = f"/todos/{uuid.uuid4()}"
valid = {"Title": "T" * 512, "Description": "D" * 2048}
for method, path, body in [
    ("GET", "/todos/", None),
    ("GET", missing_path, None),
    ("POST", "/todos/", valid),
    ("PUT", missing_path, {**valid, "IsCompleted": False}),
    ("DELETE", missing_path, None),
]:
    send(path, body, 401, method)

created = send("/todos/", valid, 201, token=token)
path = f"/todos/{created['id']}"
try:
    assert created["ownerId"] == claims["sub"]
    assert send(path, None, 200, "GET", token) == created
    listing = send("/todos/", None, 200, "GET", token)
    assert isinstance(listing, list) and created in listing
    for invalid in [
        {"Title": " ", "Description": None},
        {"Title": "T" * 513, "Description": None},
        {"Title": "valid", "Description": "D" * 2049},
    ]:
        send("/todos/", invalid, 400, token=token)
        send(path, {**invalid, "IsCompleted": False}, 400, "PUT", token)

    other_email = f"signup-{uuid.uuid4().hex}@example.com"
    send("/auth/signup", {"Email": other_email, "Password": password, "Name": "Other owner"}, 200)
    other_jar = CookieJar()
    other_browser = build_opener(HTTPCookieProcessor(other_jar))
    send("/auth/login", {"Email": other_email, "Password": password}, 200, session=other_browser)
    other_token = next(cookie.value for cookie in other_jar if cookie.name == "access_token")
    send(user_path, None, 403, "GET", other_token)
    send(user_path + "/todos", None, 403, "GET", other_token)
    assert send("/todos/", None, 200, "GET", other_token) == []
    send(path, None, 404, "GET", other_token)
    send(path, {"Title": "Not allowed", "Description": None, "IsCompleted": True}, 404, "PUT", other_token)
    send(path, None, 404, "DELETE", other_token)
    assert send(path, None, 200, "GET", token) == created

    # Simulate trusted admin issuance without changing a database user's role.
    settings = json.loads((Path(__file__).resolve().parents[1] / "appsettings.Development.json").read_text())
    key = settings["Jwt"]["Key"].encode()
    signature = base64.urlsafe_b64decode(parts[2] + "=" * (-len(parts[2]) % 4))
    assert hmac.compare_digest(signature, hmac.digest(key, f"{parts[0]}.{parts[1]}".encode(), hashlib.sha256)), "Run against the API using appsettings.Development.json's signing key"
    admin_claims = {**claims, "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin"}
    payload = base64.urlsafe_b64encode(json.dumps(admin_claims).encode()).decode().rstrip("=")
    unsigned = f"{parts[0]}.{payload}"
    signature = base64.urlsafe_b64encode(hmac.digest(key, unsigned.encode(), hashlib.sha256)).decode().rstrip("=")
    admin_token = f"{unsigned}.{signature}"
    send(user_path, None, 401, "GET", f"{unsigned}.{parts[2]}")
    profile = send(user_path, None, 200, "GET", admin_token)
    assert profile == {"email": email, "name": "Signup check"}
    assert created in send(user_path + "/todos", None, 200, "GET", admin_token)
    send("/users", user_create, 409, token=admin_token)

    update = {"Title": "Updated", "Description": None, "IsCompleted": True}
    updated = send(path, update, 200, "PUT", token)
    assert updated["title"] == "Updated" and updated["isCompleted"] and updated["completedAt"]
    reopened = send(path, {**update, "IsCompleted": False}, 200, "PUT", token)
    assert not reopened["isCompleted"] and reopened["completedAt"] is None
    send(missing_path, None, 404, "GET", token)
    send(missing_path, update, 404, "PUT", token)
    send(missing_path, None, 404, "DELETE", token)
finally:
    send(path, None, 204, "DELETE", token)
send(path, None, 404, "GET", token)
send(path, None, 404, "DELETE", token)
assert isinstance(send("/todos/", None, 200, "GET", session=browser), list)
send("/todos/", valid, 400, session=browser)
send("/todos/", valid, 400, session=browser, csrf="forged-token")
send("/todos/", valid, 400, session=browser, csrf=anonymous_csrf)
authenticated_csrf = send("/auth/csrf", None, 200, "GET", session=browser)["csrfToken"]
cookie_todo = send("/todos/", valid, 201, session=browser, csrf=authenticated_csrf)
cookie_path = f"/todos/{cookie_todo['id']}"
try:
    send(cookie_path, None, 400, "DELETE", session=browser)
    send(cookie_path, None, 204, "DELETE", session=browser, csrf=authenticated_csrf)
except BaseException:
    send(cookie_path, None, 204, "DELETE", token)
    raise
send("/auth/logout", None, 400, session=browser)
send("/auth/logout", None, 204, session=browser, csrf=authenticated_csrf)
assert not any(cookie.name == "access_token" for cookie in jar)
send("/todos/", None, 401, "GET", session=browser)
send("/todos/", None, 200, "GET", token)
print("Cookie login/logout, CSRF, Bearer authentication, Todo CRUD, and User authorization checks passed.")
