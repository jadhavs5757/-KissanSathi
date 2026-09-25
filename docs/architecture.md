# KisanSaarthi AI — Architectural Specification

## 1. System Vision & Persona
**KisanSaarthi AI** ("Know What to Grow. Know What to Do Next.") is an intelligent, full-stack agricultural decision-support platform designed for small and marginal farmers across India.

### Product Lifecycle
```
PLAN (Land, Soil, Water, Budget)
  ↓
DECIDE (AI Crop Suitability & Scenarios)
  ↓
PLANT (Optimal Sowing & Basal Nutrition)
  ↓
MONITOR (8-Stage Growth Milestones)
  ↓
PROTECT (Weather-Aware Action Engine)
  ↓
HARVEST (Timely Harvest Execution)
  ↓
SELL (APMC Realization vs Expenses)
  ↓
ANALYSE (Historical Audit & Future Planning)
```

The central product question answered at every step is:
> **"Given what this farmer has, what should happen next?"**

---

## 2. Technology Stack & Separation of Concerns

### Frontend (Client)
- **Framework**: React 18 + Vite
- **Routing**: React Router DOM (v6)
- **Styling**: Tailwind CSS with rich custom agricultural palette (`forest`, `earth`, `amber`, `slate`)
- **Icons**: Lucide React
- **Animations**: Framer Motion (page transitions, cards, modals)
- **HTTP Client**: Axios with credentials and interceptors
- **Security Rule**: The React client **never** contains `GEMINI_API_KEY`, `JWT_SECRET`, or database credentials.

### Backend (Server)
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database Engine**:
  - PostgreSQL 15/16 (via `pg.Pool` when `DATABASE_URL` is provided)
  - Persistent embedded PostgreSQL WebAssembly (`@electric-sql/pglite`) for local zero-config persistence
- **Authentication**: bcrypt (password hashing) + signed JWT (via Bearer token & HTTP-only cookies)
- **Validation**: Zod (for request bodies, query params, URL parameters, and Gemini structured outputs)
- **AI Integration**: Official `@google/genai` SDK called **strictly** on the server side
- **Security Headers & Protection**: Helmet, strict CORS, express-rate-limit

---

## 3. Row Level Security & Data Isolation
The backend is the primary authorization boundary:
1. Every authenticated request derives user identity **exclusively** from the verified JWT payload (`req.user.id`).
2. Client-supplied user IDs in request bodies (`req.body.userId`) are explicitly ignored and rejected.
3. Every resource lookup (farms, crop plans, business plans, cycles, tasks, expenses, AI history) enforces ownership through direct SQL parameterization.
4. Requests attempting to access resources belonging to another user return `404 Not Found` rather than leaking resource existence.

---

## 4. Role of Artificial Intelligence & Safety Boundaries
Gemini 2.5 Flash acts as an explainable reasoning layer, bound to the authoritative farm context retrieved from PostgreSQL:
- **Deterministic Mathematics**: All business plan scenarios (Conservative, Expected, Favorable) and net return calculations (`Net = Revenue - Total Cost`) are computed deterministically by backend code. Gemini never acts as an unvalidated financial calculator.
- **Agricultural Safety Rules**:
  - Never guarantees crop profit or yield.
  - Never claims exact NPK values from an ordinary smartphone photo.
  - Never invents chemical pesticide dosages; directs farmers to authorized local agricultural extension officers.
  - Never invents weather; converts real meteorological feeds (Open-Meteo) into actionable field operations (e.g. holding irrigation during heavy rainfall forecasts).
- **Zod Schema Enforcement**: Every AI output is parsed and validated against strict Zod schemas before persistence in `ai_histories` and delivery to the user.
