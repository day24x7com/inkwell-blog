# Inkwell — Full-Stack Blog

Angular 19 · FastAPI · PostgreSQL — a small but complete blog with JWT auth,
post CRUD, Markdown rendering, tags, search and comments.

![Post list](screenshot-list.png)

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 19 (standalone components, signals, lazy routes) |
| Backend | FastAPI + SQLAlchemy 2.0 (async) + asyncpg |
| Database | PostgreSQL 17 |
| Auth | JWT bearer tokens, bcrypt password hashing |

## Features

- **Auth** — register, login, `/auth/me`; token persisted in `localStorage`
- **Posts** — create, edit, delete (author-only), draft/published state
- **Slugs** — auto-generated from the title, deduplicated (`-2`, `-3`, …)
- **Tags** — auto-created on write, filter the index by tag
- **Search** — case-insensitive title/excerpt search
- **Comments** — threaded list, add when signed in
- **Markdown** — custom dependency-free renderer (headings, lists, code,
  tables, quotes); output is HTML-escaped before rendering
- **Pagination** — `page` / `size` on the posts endpoint

## Layout

```
blog/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app, CORS, lifespan
│   │   ├── config.py      # settings from .env
│   │   ├── database.py    # async engine + session
│   │   ├── models.py      # User, Post, Tag, Comment
│   │   ├── schemas.py     # Pydantic request/response models
│   │   ├── security.py    # bcrypt + JWT helpers, slugify
│   │   ├── deps.py        # current-user dependencies
│   │   └── routers/       # auth.py, posts.py, comments.py
│   ├── seed.py            # demo users, posts and comments
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/app/
    │   ├── core/          # models, services, guard, interceptor
    │   ├── features/
    │   │   ├── auth/      # login, register
    │   │   └── posts/     # list, detail, editor
    │   └── shared/        # markdown renderer
    └── proxy.conf.json    # /api → http://127.0.0.1:8080
```

## Running it

### 1. PostgreSQL

```bash
sudo -u postgres psql -c "CREATE ROLE blog LOGIN PASSWORD 'blogpass' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE blogdb OWNER blog;"
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/python seed.py                        # demo data
./.venv/bin/uvicorn app.main:app --port 8080 --reload
```

API docs: <http://127.0.0.1:8080/docs>

### 3. Frontend

```bash
cd frontend
npm install
npx ng serve --port 4200
```

App: <http://127.0.0.1:4200>

### Demo credentials

```
ada   / password123
grace / password123
```

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get JWT (form-encoded) |
| GET | `/api/auth/me` | ✔ | Current user |
| GET | `/api/posts` | — | List (`page`, `size`, `tag`, `q`) |
| POST | `/api/posts` | ✔ | Create post |
| GET | `/api/posts/{slug}` | — | Read post |
| PUT | `/api/posts/{id}` | ✔ | Update (author only) |
| DELETE | `/api/posts/{id}` | ✔ | Delete (author only) |
| GET | `/api/posts/{slug}/comments` | — | List comments |
| POST | `/api/posts/{slug}/comments` | ✔ | Add comment |
| DELETE | `/api/posts/{slug}/comments/{id}` | ✔ | Delete own comment |
| GET | `/api/health` | — | Liveness probe |

## Deploying

### Live

- **Frontend:** https://day24x7com.github.io/inkwell-blog/ (GitHub Pages)
- **Images:** `ghcr.io/day24x7com/inkwell-api`, `ghcr.io/day24x7com/inkwell-web`

The Pages build serves the UI; the API is not hosted there. To make the live
frontend fully functional, deploy the backend and point it at the UI:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/day24x7com/inkwell-blog)

1. Click the button above (or open `render.yaml` in the Render dashboard).
   Render creates the API and a managed PostgreSQL instance together and
   generates `SECRET_KEY` for you.
2. Once the service is healthy, copy its URL (`https://<name>.onrender.com/api`)
   into the repository variable **`INKWELL_API_URL`**
   (*Settings → Secrets and variables → Actions → Variables*).
3. Re-run the **Deploy frontend to GitHub Pages** workflow. It rewrites
   `config.js`, so the Pages build calls your API instead of same-origin `/api`.

Free Render instances sleep after inactivity, so the first request may take a
few seconds.

### Docker Compose (single host / VPS)

```bash
cp backend/.env.example .env          # then edit SECRET_KEY, POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec api python seed.py   # optional demo data
```

Frontend on `:8081`, API on `:8080`. nginx serves the SPA and proxies `/api` to
the `api` service, so there is no CORS preflight in production.

### Images

`.github/workflows/docker.yml` publishes two images to GHCR on every push to
`main` and on `v*` tags:

- `ghcr.io/day24x7com/inkwell-api`
- `ghcr.io/day24x7com/inkwell-web`

### Managed platforms

The two tiers deploy independently:

| Tier | Suggested host | Notes |
| --- | --- | --- |
| API | Railway / Render / Fly.io | Use `backend/Dockerfile`; add a managed PostgreSQL and set `DATABASE_URL` |
| Web | Vercel / Netlify / Cloudflare Pages | Build `frontend`, output `dist/frontend/browser` |

When the web tier lives on a different origin than the API, point it at the
backend by editing `frontend/public/config.js` (served at `/config.js`):

```js
window.__INKWELL_API__ = 'https://your-api-host.example.com/api';
```

Add that origin to `CORS_ORIGINS` on the API.

### Required environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing key — `python -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime, default `1440` |

## CI

`.github/workflows/ci.yml` runs on every push and PR:

- **Backend** — ruff lint, boots the API against a PostgreSQL 17 service
  container, then runs `scripts/smoke_test.py` (26 assertions covering auth,
  CRUD, slug stability, filters, comments and the 401 boundary).
- **Frontend** — `npm ci` + production build.

Run the smoke test locally against a running server:

```bash
cd backend
API_URL=http://127.0.0.1:8080/api ./.venv/bin/python -m scripts.smoke_test
```

## Notes

- Tables are created on startup via `Base.metadata.create_all`. For schema
  evolution in production, add Alembic and generate migrations instead.
- Change `SECRET_KEY` in `backend/.env` before deploying anywhere real.
- CORS origins live in `CORS_ORIGINS`; the Angular dev server proxies `/api`
  so no CORS preflight is needed in development.
