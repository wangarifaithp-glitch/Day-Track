# DAYTRACK

DAYTRACK is a mobile-first personal time management and self-improvement application for tracking activities, routines, planned versus actual time, habits, and daily reflection.

## Current Workspace State

The workspace includes persisted activity tracking, Calendar, Planner, Goals, Journal, Habits, Insights, and email/password authentication with email verification, password reset, and per-user data ownership. Routines, focus tracking, and AI are not implemented yet.

## Daily Activity Tracking

- Activities can be logged manually or timed, categorized, viewed, edited, and deleted.
- The default categories are Personal Care, Spiritual, Learning, Work, Health & Fitness, Meals, Family & Social, Chores & Responsibilities, Entertainment, Social Media, Sleep, Other, Transport & Commuting, Errands & Shopping, Finance & Administration, Creative Hobbies, Pet Care, Travel & Exploration, Volunteering & Community, Caregiving, Gardening & Outdoor Time, Medical Appointments, Home Projects & Repairs, Professional Development, Digital Administration, Rest & Recovery, Events & Culture, and Childcare & School Runs. Their persisted color and icon fields allow future customization.
- Activity start/end timestamps are stored in UTC. The browser sends the local calendar date separately and converts entered local times to timezone-aware timestamps; date-only grouping follows that local date.
- Completed activities require a positive time range. Overlapping activities are rejected, and an owner-scoped database index and PostgreSQL transaction lock prevent multiple active timers.
- The dashboard totals and timeline are loaded from the API; no sample activity data is displayed.

In production, data routes require a verified account and scope records to the authenticated user. Local development keeps the fixed development owner when `APP_ENV=development` and no session cookie is present; never use that setting for a public deployment. Existing development records stay separate from newly registered accounts.

## Authentication and Deployment Configuration

The API supports account registration, email verification, sign-in, sign-out, password reset, and a current-user endpoint. Sessions use signed, HTTP-only cookies; passwords are Argon2-hashed, and verification/reset tokens are stored hashed and expire. Configure these environment variables on the backend:

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | Set to `production` on Render. |
| `AUTH_SECRET_KEY` | Random secret of at least 32 characters used to sign sessions. Keep private. |
| `APP_BASE_URL` | Public frontend origin used in email links and automatically included in the backend's allowed origins, without a trailing slash. |
| `CORS_ORIGINS` | Comma-separated exact frontend origins, without trailing slashes. |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server and port for verification and reset email. |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | SMTP credentials, if required by the provider. |
| `SMTP_SENDER` | Verified sender email address. |
| `SMTP_USE_SSL` | Set `true` for implicit TLS (usually port 465); otherwise STARTTLS is used. |

For a Render Static Site with the repository root as its root directory, use `cd frontend && npm install && npm run build` as the build command and `frontend/dist` as the publish directory. If `frontend` is the root directory, use `npm install && npm run build` and `dist`. The frontend uses hash-based routes, so direct sign-in and verification links work without a Static Site rewrite.

The production frontend defaults to `https://day-track.onrender.com/api/v1`. For another deployment, set `VITE_API_URL` in the Static Site's **build environment variables** to that backend URL ending in `/api/v1`. Do not set it to `localhost` or `127.0.0.1` for the live site; those addresses refer to each visitor's device. A backend URL that omits `/api/v1` is normalized automatically.

Set `APP_BASE_URL` to the exact public frontend origin. It is automatically included in the backend's allowed origins; `CORS_ORIGINS` can list additional exact frontend origins. Because the session cookie is HTTP-only, frontend API requests include credentials and backend CORS must use explicit origins. Browser state-changing requests are also checked against the configured origins.

Auth endpoints (under `/api/v1/auth`):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/register` | Create an unverified account and send a verification link. |
| `POST` | `/verify-email` | Verify an account using the one-time email token. |
| `POST` | `/resend-verification` | Resend an account verification link. |
| `POST` | `/login` | Sign in and set the HTTP-only session cookie. |
| `POST` | `/logout` | Clear the session cookie. |
| `POST` | `/forgot-password` | Send a password reset link when the email belongs to an account. |
| `POST` | `/reset-password` | Reset a password using its one-time email token. |
| `GET` | `/me` | Return the currently authenticated user. |

API endpoints (all under `/api/v1`):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/categories` | List available activity categories |
| `POST` | `/activities` | Create a completed activity |
| `GET` | `/activities?activity_date=YYYY-MM-DD` | Get a day's activities in chronological order |
| `GET` | `/activities/history?limit=50&offset=0&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` | Get paginated activity history, optionally filtered by local activity-date range |
| `GET` | `/activities/active` | Recover the active activity, or `null` |
| `POST` | `/activities/start` | Start a timer |
| `POST` | `/activities/{id}/stop` | Stop a timer |
| `GET` | `/activities/{id}` | View activity details |
| `PATCH` | `/activities/{id}` | Update a completed activity |
| `DELETE` | `/activities/{id}` | Delete an activity |

## Goals

Goals can be created, listed, viewed, edited, and deleted through the responsive Goals page. Each goal has a title, optional description and target date, 0–100% progress, and an `active`, `paused`, or `completed` status. The API is owner-scoped using the same development-only owner described above.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/goals` | List goals |
| `POST` | `/goals` | Create a goal |
| `GET` | `/goals/{id}` | View goal details |
| `PATCH` | `/goals/{id}` | Update a goal |
| `DELETE` | `/goals/{id}` | Delete a goal |

## Habits

The Habits page lets you create, view, edit, and delete daily habits, then record or undo completion for a selected date. Each habit has a name and optional description. Completion history is persisted, and current streaks are calculated from consecutive completed dates.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/habits?habit_date=YYYY-MM-DD` | List habits and progress for a date |
| `POST` | `/habits` | Create a habit |
| `GET` | `/habits/{id}` | View habit details |
| `PATCH` | `/habits/{id}` | Edit a habit |
| `DELETE` | `/habits/{id}` | Delete a habit and its completion history |
| `PUT` | `/habits/{id}/completions/{date}` | Mark a habit complete for a date |
| `DELETE` | `/habits/{id}/completions/{date}` | Undo a completion |

## Journal

Journal entries are saved to the backend and can be created, listed, viewed, edited, and deleted from the Journal page. Each entry has a date, optional title, writing content, and created/updated timestamps. The API is owner-scoped using the same development-only owner described above.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/journal?limit=50&offset=0` | List journal entries, newest date first |
| `POST` | `/journal` | Create a journal entry |
| `GET` | `/journal/{id}` | View entry details |
| `PATCH` | `/journal/{id}` | Edit an entry |
| `DELETE` | `/journal/{id}` | Delete an entry |

## Daily Planner

The Planner page stores date-specific planned activities through the backend. Each item has a title, category, local plan date, start/end timestamps, optional notes, and calculated duration. The page supports date navigation and creating, editing, and deleting plan items. Overlapping planned items for the same development owner are rejected; plans remain separate from actual activity logs.

Planner API endpoints (under `/api/v1`):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/planner?plan_date=YYYY-MM-DD` | List a day's plan in chronological order |
| `POST` | `/planner` | Create a planned activity |
| `GET` | `/planner/{id}` | View a planned activity |
| `PATCH` | `/planner/{id}` | Update a planned activity |
| `DELETE` | `/planner/{id}` | Delete a planned activity |

## Calendar and reminders

The Calendar page displays timed or all-day events in a month grid, supports direct navigation to years 1–9999, and lets you create, view, edit, and delete important or ordinary events. Events may span multiple dates. Each event can have up to 10 reminders, including defaults before and at the event and custom reminders before or after its start or end.

Due reminders are persisted as in-app notifications. The backend reminder worker runs while the API is running; browser push can also display alerts when the app is closed, provided the user enables browser permission, the server has a VAPID key pair configured, and the browser's push service is available. Production Web Push requires HTTPS. No browser permission is requested until the user chooses to enable notifications.

Calendar and notification API endpoints (under `/api/v1`):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/calendar/events?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` | List events overlapping a date range |
| `POST` | `/calendar/events` | Create an event and its reminder schedule |
| `GET` | `/calendar/events/{id}` | View event details |
| `PUT` | `/calendar/events/{id}` | Replace an event and its reminder schedule |
| `DELETE` | `/calendar/events/{id}` | Delete an event and its scheduled reminders |
| `GET` | `/notifications?unread_only=false&limit=30` | List in-app notifications |
| `POST` | `/notifications/{id}/read` | Mark a notification as read |
| `GET` | `/notifications/push/public-key` | Check push configuration and retrieve its public key |
| `POST` | `/notifications/push-subscriptions` | Register a browser push subscription |
| `DELETE` | `/notifications/push-subscriptions?endpoint=...` | Remove a browser push subscription |

`backend/.env` is local-only and ignored by Git. Configure `VAPID_PRIVATE_KEY_FILE` to a PEM P-256 private key outside the repository and `VAPID_PUBLIC_KEY` to its URL-safe base64 public key. Never commit the private key. The current development setup keeps the key under `%LOCALAPPDATA%\DAYWISE\`; the public key and key path are in the ignored local `.env`.

## Insights and appearance

The Insights page summarizes persisted activity history for a selected day, week, or month. It shows tracked time, daily averages, category breakdowns, and recent activities; figures are derived from activity records and are not AI-generated. The activity-history endpoint supports optional `start_date` and `end_date` filters so the page only requests the selected range. Appearance settings offer Forest, Flow, and Warm palettes, light or dark mode, 15 built-in photographic wallpapers, and the option to upload a background image applied across the app. These preferences are saved in the current browser; uploaded images are resized and stored locally rather than uploaded. The bundled photos are from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). Sources: [Alpine Lake](https://unsplash.com/photos/three-brown-wooden-boat-on-blue-lake-water-taken-at-daytime-T7K4aEPoGGk), [Cinque Terre](https://unsplash.com/photos/vernazza-coastal-village-in-italy-cYrMQA7a3Wc), [Starlit Peaks](https://unsplash.com/photos/snow-mountain-under-stars-phIFdC6lA4E), [Yosemite Valley](https://unsplash.com/photos/river-in-yosemite-valley-at-low-light-NRQV-hBF10M), [Mountain Retreat](https://unsplash.com/photos/brown-house-near-body-of-water-zAjdgNXsMeg), [Turquoise Coast](https://unsplash.com/photos/seashore-during-golden-hour-KMn4VEeEPR8), [Dubai Dunes](https://unsplash.com/photos/a-large-group-of-sand-dunes-under-a-blue-sky-RPkXbErNJow), [Lake Atitlan](https://unsplash.com/photos/stone-path-to-lake-atitlan-pier-K2s_YE031CA), [Palm Horizon](https://unsplash.com/photos/palm-tree-leaf-near-at-body-of-water-FbN2z3bEaSs), [Pier at Dusk](https://unsplash.com/photos/golden-hour-photography-of-docking-pier-on-body-of-water-uwbajDCODj4), [Forest Waterfall](https://unsplash.com/photos/water-falls-in-the-middle-of-forest-07dFoC3QaTw), [Island Twilight](https://unsplash.com/photos/landscape-photography-of-tree-on-rock-formation-surrounded-by-body-of-water-near-mountain-during-sunset--aTKERomQOg), [Mossy River](https://unsplash.com/photos/green-moss-on-brown-rock-formation-near-river-during-daytime-rH-1znS1Hdk), [Forest Stream](https://unsplash.com/photos/a-river-running-through-a-lush-green-forest-Oozzwv8GXD4), and [Open Meadow](https://unsplash.com/photos/green-grass-field-under-blue-sky-during-daytime--PIIOicyNAk).

```text
DAYWISE/
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       ├── services/
│       ├── types/
│       └── utils/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   └── tests/
└── README.md
```

## Recommended Frontend Structure

As implementation begins, use this structure instead of placing application logic in a single entry file:

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── charts/
│   │   └── forms/
│   ├── features/
│   │   ├── activities/
│   │   ├── routines/
│   │   ├── habits/
│   │   ├── reflections/
│   │   └── analytics/
│   ├── layouts/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── assets/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

Organize by feature as the application grows. Shared UI and utilities should remain in reusable, general-purpose folders.

## Recommended Backend Structure

The initial backend should follow a modular API and domain layout:

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── router.py
│   │   ├── dependencies.py
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── activities.py
│   │       ├── routines.py
│   │       └── habits.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── logging.py
│   ├── db/
│   │   ├── base.py
│   │   └── session.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── ai/
├── migrations/
├── tests/
├── alembic.ini
├── pyproject.toml
└── .env.example
```

The `ai/` area should be an interface and service boundary now, but no provider or API integration should be added until the AI phase.

## Initial Dependencies

### Frontend

- `react`
- `react-dom`
- `typescript`
- `vite`
- `tailwindcss`
- `lucide-react`
- `recharts`
- `react-router-dom`

Testing and quality tooling:

- `vitest`
- `@testing-library/react`
- `eslint`
- `prettier`

Start with one CSS approach: Tailwind CSS. Do not add a component library or state-management framework until a real requirement demonstrates that it is needed.

### Backend

- `fastapi`
- `uvicorn[standard]`
- `sqlalchemy`
- `psycopg[binary]`
- `alembic`
- `pydantic-settings`
- `python-dotenv`
- `argon2-cffi`
- `itsdangerous`

Testing and quality tooling:

- `pytest`
- `pytest-cov`
- `httpx`
- `ruff`
- `mypy`

Prefer PostgreSQL-compatible production settings and SQLAlchemy 2.x style APIs.

## Development Setup

### Prerequisites

- Node.js 20 or newer
- npm
- Python 3.12
- PostgreSQL 16 or newer

Node scripts may need `npm.cmd` on Windows systems where PowerShell script execution is restricted.

### PostgreSQL status and setup

The current Windows environment has no PostgreSQL command-line tools, PostgreSQL service, Docker executable, or listener on `localhost:5432`. PostgreSQL migrations and end-to-end persistence have therefore not been run against a live PostgreSQL server. For local development, `backend/.env` currently points to the existing SQLite database at `%LOCALAPPDATA%\DAYWISE\daytrack-dev.db`; the Calendar, Goals, Journal, and Habits migrations were applied there without resetting the existing activity or Planner data. The database is at migration `20261119_0006`, and separate SQLite backups were created before the Journal and Habits migrations.

The simplest Windows setup is the official PostgreSQL installer, which includes pgAdmin and `psql`: <https://www.postgresql.org/download/windows/>. After installation, open PowerShell and create a dedicated role and database. Choose your own password; do not use the example literally:

```powershell
psql -U postgres -h 127.0.0.1
```

At the `psql` prompt, create a dedicated role, set its password using the secure prompt, and create its database:

```sql
CREATE ROLE daywise LOGIN;
\password daywise
CREATE DATABASE daywise OWNER daywise;
\q
```

If that role or database already exists, inspect it rather than deleting or resetting it. Edit `backend/.env` (copied from `.env.example`) and set `APP_ENV=development` and `DATABASE_URL` to the new database. URL-encode reserved characters in the password, for example `@` as `%40`. The `.env` file is git-ignored.

Run the migration only after checking that the configured URL points to the intended database:

```powershell
Set-Location "backend"
.\.venv\Scripts\Activate.ps1
alembic current
alembic upgrade head
```

Migration `20261119_0001` creates the activity tables and seeds 12 categories; `20261119_0002` adds planned activities; `20261119_0003` adds calendar events, reminders, in-app notifications, and push subscriptions; `20261119_0004` adds goals; `20261119_0005` adds journal entries; `20261119_0006` adds habits and dated completions. Do not run migrations against a database containing unrelated application data without first reviewing the target and taking a backup.

### Frontend

```powershell
Set-Location "frontend"
npm.cmd install
npm.cmd run dev
```

The frontend defaults to `http://127.0.0.1:8000/api/v1`. To override it, copy `.env.example` to `.env` and set `VITE_API_URL` to the API base URL. Only public configuration belongs in `VITE_*` variables.

### Backend

```powershell
Set-Location "backend"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Set `DATABASE_URL` in `backend/.env` to the configured PostgreSQL database URL if using PostgreSQL. Do not overwrite an existing `.env` without reviewing its local configuration. Then run:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open the API documentation at `http://127.0.0.1:8000/docs`.

Backend health check:

```text
GET http://127.0.0.1:8000/api/v1/health
```

Run backend tests:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

The backend reads `DATABASE_URL` from `backend/.env` regardless of the current working directory; an environment variable overrides the file. The default database URL is only a placeholder. The app does not silently substitute mock data when PostgreSQL is unavailable.

After applying the migration and starting the backend, confirm the seeded categories and use the interactive API documentation to create and inspect activities:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
(Invoke-RestMethod http://127.0.0.1:8000/api/v1/categories).Count
```

For persistence validation, create a completed activity and start an active one, restart the backend without stopping it, then check `GET /api/v1/activities/history`, `GET /api/v1/activities?activity_date=YYYY-MM-DD`, and `GET /api/v1/activities/active` in `http://127.0.0.1:8000/docs`. Stop the recovered timer afterward.

The automated API tests use isolated SQLite databases. The current calendar migration and CRUD smoke test were also verified against the persistent local SQLite database. They do not prove PostgreSQL behavior; PostgreSQL persistence and browser-to-PostgreSQL validation remain pending until a server and PostgreSQL `DATABASE_URL` are configured.

## Architectural Decisions Before Implementation

1. **API versioning:** Keep route modules under `/api/v1`.
2. **Database ownership:** SQLAlchemy models define persistence; Alembic owns schema migrations.
3. **Authentication:** Use server-side secure, HTTP-only, SameSite session cookies rather than storing bearer tokens in browser storage.
4. **Authorization:** Activity records have an owner ID and all activity queries are scoped to the verified account from the HTTP-only session cookie. Keep the fixed development owner restricted to local development.
5. **Time handling:** Activity timestamps are stored and returned in UTC; the current UI uses the browser's local timezone for time entry and passes its local activity date. A persisted user IANA timezone is a future authentication/settings concern.
6. **Activity model:** A timed activity with no end timestamp is active; completed duration is derived from its recorded timestamps.
7. **Data identifiers:** Prefer UUID primary keys for public-facing entities.
8. **Backend layering:** Keep API routes for transport concerns, services for domain/use-case logic, models for persistence, and schemas for validation/serialization.
9. **AI boundary:** Introduce provider-neutral service interfaces and validated structured outputs when AI is implemented. Secrets remain exclusively in backend environment variables.
10. **Configuration:** Keep typed environment settings, CORS allowlists, and separate development/test/production behavior.
11. **Testing:** Establish API, service, and database test conventions before feature implementation.
12. **Deployment:** Provide container and migration paths only after the core data model stabilizes.
13. **PWA:** Defer service workers and installability until an offline/cache policy is designed.

## Security Baseline

- No secret or API key should exist in frontend environment variables or source.
- Session signing secrets should be long, random, and environment-managed.
- Cookie-authenticated state-changing requests are checked against configured CORS origins.
- Password and session data must be handled only on the backend.
- CORS should not use wildcard origins when credentials are enabled.
- Database and session secrets must be ignored by source control.