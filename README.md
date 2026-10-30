# Todo App

A .NET API with a React + Tailwind frontend for the personal task workflow.

## Run locally

Start the API and frontend together (Docker must be running):

```sh
cd src
docker compose up --build
```

Open **http://localhost:5173**. The frontend container routes API requests to
`http://api:8080` over the Compose network. The development override enables hot
reload for frontend source changes. Rebuild after changing dependencies.

Stop both containers without deleting your database:

```sh
cd src
docker compose down
```

If you prefer running the frontend outside Docker, start only the API with
`docker compose up --build api`, then in another terminal:

```sh
cd src/TodoApp.Web
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Create an account, add a task, edit it,
mark it completed, filter or search your list, reopen it, and delete it.
Sign out and sign in again to demonstrate persisted tasks.

In Development, the API seeds an administrator on startup:

- Username: `admin` (or email `admin@example.com`)
- Password: `ChangeMe123!`

The seed hashes the password and only inserts the account when its email does
not exist. It never resets an existing account's password or role and does not
run in Production. Other accounts continue to sign in by email.

Administrators see an **Admin site** switch in the sidebar. It opens a read-only
user directory with each account's tasks; **Back to my tasks** returns to the
personal workspace. Regular users do not see the switch. User directory and
cross-user task requests require the API's `AdminOnly` policy.

The frontend proxies `/api` to the API, keeping authentication
cookies and CSRF validation on the same browser origin. Access tokens remain in
HttpOnly cookies. The frontend restores the current user and role from `/auth/me`
after a refresh, rather than trusting a role stored in the browser.

If you run the API directly with its default launch profile (port 5128):

```sh
cd src/TodoApp.Web
API_URL=http://localhost:5128 npm run dev
```

## Build and verify

### Frontend layout

Frontend code lives in `src/TodoApp.Web/src`:

- `App.jsx`: session restoration, shared task state, API actions, and view switching.
- `Admin.jsx`: admin data loading and selected-account state.
- `components/auth/AuthScreen.jsx`: sign-in and signup screen.
- `components/Sidebar.jsx`: navigation, admin switch, and sign-out.
- `components/tasks/`: task workspace, task rows, and create/edit dialog.
- `components/admin/`: user directory and read-only user task panel.
- `components/Brand.jsx` and `Icon.jsx`: shared visual components.
- `api.js`: requests, cookie authentication, CSRF tokens, and API errors.
- `styles.css`: Tailwind theme and shared styles.

Components receive data and callbacks through props. Keep API actions in `App.jsx`
or `Admin.jsx`; edit the relevant component to change its UI.

### Checks

```sh
cd src/TodoApp.Web
npm run build
npm run preview
```

Preview uses the same local API proxy. To deploy the built `dist/` directory,
serve it over HTTPS and reverse-proxy `/api/*` to the API, removing the `/api`
prefix. Production authentication cookies require HTTPS. The Vite server is
for local development and preview.

With the API and frontend running, the browser workflow check uses Python Playwright:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 checks/workflow.py
```

Run the check against a disposable development database: it creates a test
account and deletes its test task, but the account remains.

To check the API seed independently (temporary databases and servers are cleaned up):

```sh
cd src/TodoApp.Api
dotnet build
python3 checks/seed.py
```
