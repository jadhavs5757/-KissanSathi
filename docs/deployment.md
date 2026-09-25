# KisanSaarthi AI — Production Deployment Guide

## 1. Overview
KisanSaarthi AI is architected as a cohesive full-stack web application. The frontend React application compiles to static assets served directly by the Express backend in production mode, providing seamless single-port deployment on platforms like Replit, Render, Railway, or AWS.

---

## 2. Environment Variables
Configure the following environment secrets in your deployment dashboard:

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Listening server port | `5000` (or injected by host) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@ep-xyz.postgres.database.azure.com:5432/kisansaarthi` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `super_secure_random_string_at_least_32_chars` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `CLIENT_URL` | Allowed client origin for CORS | `https://kisansaarthi.replit.app` |

---

## 3. Replit Deployment Configuration
The repository includes `.replit` for 1-click publishing.

### Replit Run & Build Directives
```bash
# Build frontend static bundle
cd client && npm install && npm run build

# Install server dependencies and run migrations
cd ../server && npm install && npm run migrate && npm run seed

# Start production server
npm start
```

---

## 4. Zero-Config Database Architecture
- When `DATABASE_URL` is set to any PostgreSQL cluster (Neon, Supabase, AWS RDS, Replit DB), KisanSaarthi AI initializes `pg.Pool` with SSL support.
- If `DATABASE_URL` is not provided (such as in local evaluation or sandbox demo), the system transparently utilizes embedded persistent PostgreSQL WebAssembly (`PGlite`) with persistent disk storage, ensuring 100% full SQL features (UUIDs, JSONB, triggers, check constraints, foreign keys) without failing.

---

## 5. Security & Verification Checklist
- [x] Passwords hashed with bcrypt (salt factor 10).
- [x] JWT sessions enforced on all private routes.
- [x] Row level data isolation verified across User A and User B.
- [x] Parameterized SQL statements exclusively (zero raw query concatenation).
- [x] Helmet security headers and strict CORS origin validation.
- [x] Gemini SDK `@google/genai` encapsulated exclusively on Express backend.
- [x] Zero client-side exposure of API keys or privileged database credentials.
