# EWGCET Landfill Tracker

A web application for managing landfill operations for EWGCET in the Wilaya of Jijel, Algeria. Covers gate management, client/contract management, invoice generation, and role-based access for Admins and Operators across multiple CET and CDI sites.

## Tech Stack

- **Frontend:** React 18 + Vite 5
- **Backend:** Node.js + Express 5
- **Database:** PostgreSQL (Replit managed, via `DATABASE_URL`)
- **Auth:** Custom bcrypt-based login with in-memory rate limiting

## Running the App

```bash
npm install
npm run dev
```

- Frontend (Vite): port 5000 (proxies `/api` → port 3001)
- Backend (Express): port 3001

In production, the Express server serves the built React frontend from `dist/`.

## Database

Uses Replit's built-in PostgreSQL. The `DATABASE_URL` environment variable is set automatically. On startup, `server.js` applies any pending SQL migrations from the `migrations/` directory.

## User Preferences

- Keep existing code structure and conventions
