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

## Billing Engine (added in overhaul)

New backend endpoints in `server.js`:
- `POST /api/bills` — generates a bill for a client from all unbilled discharges with remaining balance
- `POST /api/bills/:billId/payments` — FIFO waterfall payment; returns per-discharge allocations + grouped receipt
- `GET /api/bills`, `GET /api/bills/:id`, `GET /api/bills/:billId/payments`

New tables (migration 007): `bills`, `bill_discharges`, `payments`, `discharge_payments`.

A discharge's remaining balance is always computed live (`total_ttc − SUM(applied_amount_ttc)`), never stored.

VAT helpers `toTTC(amtHT, vatSubject)` / `toHT(amtTTC, vatSubject)` defined at module level in both `server.js` and `landfill-tracker.jsx`.

## User Preferences

- Keep existing code structure and conventions
