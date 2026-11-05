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

## Notes

- Tables are created on startup via `Base.metadata.create_all`. For schema
  evolution in production, add Alembic and generate migrations instead.
- Change `SECRET_KEY` in `backend/.env` before deploying anywhere real.
- CORS origins live in `CORS_ORIGINS`; the Angular dev server proxies `/api`
  so no CORS preflight is needed in development.
