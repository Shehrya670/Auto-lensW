# Auto Lens Deployment Guide

This project is production-ready for:
- Docker on AWS EC2 (primary target)
- Vercel frontend
- Vercel backend (serverless compatible mode)
- Vercel single-project deployment (frontend + backend together)

## 1) Environment Variables

### Backend (`backend/.env`)

Use `backend/.env.example` as template.

Required:
- `NODE_ENV=production`
- `PORT=5000`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRE=7d`
- `CLIENT_URLS=https://your-frontend-domain.com,https://your-preview-domain.vercel.app`

Database (choose one):
- Preferred: `DATABASE_URL=postgres://user:pass@host:5432/dbname`
- Or fallback:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`
  - `DB_SSL=true|false`

Optional pool tuning:
- `DB_MAX_POOL_SIZE=10`
- `DB_CONNECTION_TIMEOUT_MS=5000`
- `DB_IDLE_TIMEOUT_MS=30000`

Image uploads (required for avatar/car image upload):
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Frontend (`frontend/frontend/.env`)

Use `frontend/frontend/.env.example` as template.

Required in split-domain deployments:
- `REACT_APP_API_URL=https://your-backend-domain.com/api`

If frontend and backend are served from same domain/proxy, you can omit it and frontend will call `/api`.

---

## 2) Deploy on AWS EC2 + Docker

### On EC2 (one-time setup)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Reconnect SSH after adding user to docker group.

### Deploy steps

```bash
git clone <your-repo-url>
cd Auto-lens
cp backend/.env.example backend/.env
# Edit backend/.env with production values
docker compose up -d --build
```

### Verify

```bash
docker compose ps
curl http://localhost:5000/healthz
curl http://localhost:5000/readyz
```

---

## 3) Deploy Frontend on Vercel

1. Import repo to Vercel.
2. Set **Root Directory** to `frontend/frontend`.
3. Build command: `npm run build` (default).
4. Output directory: `build` (CRA default).
5. Add env var:
   - `REACT_APP_API_URL=https://<backend-domain>/api`
6. Deploy.

`frontend/frontend/vercel.json` already includes SPA rewrite to `index.html`.

---

## 4) Deploy Backend on Vercel

1. Create a separate Vercel project from same repo.
2. Set **Root Directory** to `backend`.
3. Add backend environment variables from section 1.
4. Deploy.

`backend/vercel.json` routes all requests to `server.js` using `@vercel/node`.

---

## 4.1) Deploy as a Single Vercel Project (recommended if you want one URL)

This repository now includes root [`vercel.json`](vercel.json) that builds:
- frontend from `frontend/frontend`
- backend function from `backend/server.js`

And routes:
- `/api/*` -> backend
- all other routes -> frontend SPA

Steps:
1. Create/import one Vercel project from repo root (`Auto-lens`).
2. Root directory should be repository root (do not set `frontend/frontend`).
3. Add environment variables:
   - Backend vars from section 1 (`JWT_SECRET`, DB vars, Cloudinary, etc.)
   - Optional frontend var:
     - `REACT_APP_API_URL=https://<same-domain>/api`
4. Deploy.

Notes:
- If `REACT_APP_API_URL` is not set in production, frontend falls back to same-origin `/api` automatically.
- Keep only one active production alias for this single-project setup.

---

## 5) Production Verification Checklist

- Backend:
  - `GET /healthz` returns `{ status: "ok" }`
  - `GET /readyz` returns `{ status: "ready" }`
  - CORS allows deployed frontend origin
  - Auth endpoints work (`signup`, `login`, `me`, `logout`)
  - DB queries succeed

- Frontend:
  - App loads without localhost API calls in production
  - Login/logout/profile flow works
  - Cars list/search/favorites work
  - Upload features work with Cloudinary env vars set

---

## 6) Useful Commands

### Local backend
```bash
cd backend
npm install
npm run dev
```

### Local frontend
```bash
cd frontend/frontend
npm install
npm start
```

### Optional DB bootstrap
```bash
cd backend
npm run db:setup
```

