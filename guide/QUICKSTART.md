# Quick Start — local development

Gets `prep_ncert/frontend` and `prep_ncert/backend` running on your machine, talking to a local Postgres.

## Prerequisites

- Node.js 22+
- PostgreSQL 16+ installed natively **or** Docker Desktop (see options in Step 1)
- A Google Cloud OAuth client ID (for Google sign-in) — see [Google sign-in setup](#google-sign-in-setup) below. You can skip this and use email/password sign-in only while developing.

## 1. Start Postgres

### Option A — Native PostgreSQL (no Docker needed)

If you already have PostgreSQL installed (check: `psql --version`), create the app database and user:

```bash
# Run as the postgres superuser — adjust the port if yours differs from 5432
psql -U postgres -p 5432 -h localhost
```

Then inside `psql`:

```sql
CREATE USER ncert_prep_user WITH PASSWORD 'ncert_prep_pass' CREATEDB;
CREATE DATABASE prep_ncert OWNER ncert_prep_user;
GRANT ALL PRIVILEGES ON DATABASE prep_ncert TO ncert_prep_user;
\q
```

> **Windows tip:** PostgreSQL 17+ installs on port 5433 by default when 5432 is already taken.
> Run `netstat -ano | findstr ":5432 :5433"` to confirm which port is live, then adjust the `DATABASE_URL` below accordingly.

### Option B — Docker

```bash
cd prep_ncert
docker compose up -d postgres
```

This starts Postgres 16 on `localhost:5432` with the credentials already baked into `backend/.env.example`.

## 2. Backend

```bash
cd prep_ncert/backend
cp .env.example .env
```

Edit `.env`:

| Variable | Local value |
|---|---|
| `DATABASE_URL` | Leave as-is if you used `docker compose up -d postgres` unchanged |
| `SESSION_SECRET` | Any random string — generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | From [Google sign-in setup](#google-sign-in-setup); leave blank to skip Google sign-in locally |
| `SES_FROM_EMAIL` | Leave blank — emails (verification, password reset, parent consent) just print to the console instead of sending |
| `FRONTEND_ORIGIN` | `http://localhost:3000` (Vite's default port, see `vite.config.ts`) |

Install, create the schema, and run:

```bash
npm install
npm run prisma:migrate -- --name init
npm run dev
```

The API is now on `http://localhost:4000`. Check it:

```bash
curl http://localhost:4000/api/health
# {"ok":true,"dbTime":"..."}
```

`npm run prisma:studio` opens a local GUI on the database if you want to inspect tables directly.

## 3. Frontend

In a second terminal:

```bash
cd prep_ncert/frontend
# .env already exists if you're continuing from the earlier migration work; otherwise:
cp .env.example .env
npm install
npm run dev
```

Set in `.env` (frontend):

| Variable | Local value |
|---|---|
| `VITE_API_URL` | `http://localhost:4000` |
| `VITE_GOOGLE_CLIENT_ID` | Same client ID as the backend's `GOOGLE_CLIENT_ID`, if using Google sign-in |
| `VITE_FIREBASE_*` | Still required for now — the video catalogue, notes, XP display and leaderboard UI are still Firebase-backed until their migration phase (see `docs/AWS_EC2_MIGRATION_PLAN.md`) |

Open `http://localhost:3000`. Register with email/password (or Google, if configured) — you should land signed in, with the session persisted via an httpOnly cookie against the local backend.

## 4. Verify the full auth flow (optional but recommended)

```bash
cd prep_ncert/backend
curl -c cookies.txt -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","classGrade":9}'
curl -b cookies.txt -s http://localhost:4000/api/auth/me
```

The register call's response is logged in the backend terminal too (the email-verification link), since `SES_FROM_EMAIL` is unset — that's expected locally.

## Google sign-in setup

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Authorized JavaScript origins: `http://localhost:3000` (add your production domain later — see the AWS deployment guide).
4. Copy the **Client ID** into both `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`). No client *secret* is needed — Google Identity Services runs entirely client-side and the backend only verifies the ID token.

## Common issues

| Symptom | Fix |
|---|---|
| `ECONNREFUSED` on `npm run dev` (backend) | Postgres isn't running — start the service (`Get-Service postgresql*` on Windows to check) or `docker compose up -d postgres` if using Docker |
| `P3014` — Prisma shadow database permission denied | Run `ALTER USER ncert_prep_user CREATEDB;` as the postgres superuser |
| `Error: SESSION_SECRET is not set` | Fill in `backend/.env` |
| Google button does nothing / console error about `VITE_GOOGLE_CLIENT_ID` | Either configure it (above) or use email/password sign-in |
| CORS error in the browser console | `FRONTEND_ORIGIN` in `backend/.env` must exactly match the URL the frontend is served from, including port |
| Port conflict — backend can't connect and `DATABASE_URL` has port 5432 | PG17 on Windows often installs on 5433; run `netstat -ano \| findstr ":5432 :5433"` and update the port in `backend/.env` |
