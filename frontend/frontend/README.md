# Frontend (Create React App)

## Local Development

```bash
npm install
npm start
```

App runs at `http://localhost:3000` by default.

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set:

- `REACT_APP_API_URL=https://your-backend-domain.com/api`

Notes:

- In development, if `REACT_APP_API_URL` is not set, frontend falls back to `http://localhost:5000/api`.
- In production, if `REACT_APP_API_URL` is not set, frontend uses same-origin `/api` (for reverse-proxy deployments).

## Production Build

```bash
npm run build
```

Build output is generated in `build/`.

## Vercel Deployment

- Root directory: `frontend/frontend`
- Build command: `npm run build`
- Output directory: `build`
- Add env var `REACT_APP_API_URL` in Vercel project settings

SPA routing is handled by `vercel.json`.
