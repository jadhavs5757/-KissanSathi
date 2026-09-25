# KisanSaarthi AI (किसान सारथी)
> **Know What to Grow. Know What to Do Next.**

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg)](https://nodejs.org/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-Official%20SDK-8e75ff.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Product Overview
**KisanSaarthi AI** is an intelligent, full-stack farm planning and lifecycle management platform designed specifically for small and marginal farmers across India.

Instead of generic advice or isolated chat demos, KisanSaarthi AI brings together the entire agricultural decision workflow:
```
PLAN → DECIDE → PLANT → MONITOR → PROTECT → HARVEST → SELL → ANALYSE
```
The central mission is to answer:
> **"Given what this farmer has (land, soil, water, budget, equipment), what options should they consider, what are the tradeoffs, and what should happen next?"**

---

## 2. Key Features
- **Deterministic Digital Farm Profile**: Models land area, ownership (Owned/Leased), soil health card metrics (NPK, pH, organic carbon), water infrastructure (Borewell, Open Well, Canal, Rainfed, pump HP, operational hours), and capital budget.
- **AI Crop Recommendation Engine**: Powered by Google Gemini (`@google/genai`) using bounded agro-climatic prompts. Produces multiple suitable crop alternatives with transparent water implications, duration, investment ranges, risk profiles, tradeoffs, and assumptions.
- **Deterministic Business Plan Modeling**: Backend algorithms deterministically calculate **Conservative**, **Expected**, and **Favorable** financial return scenarios (`Net = Revenue - Total Cost`) with full itemized cost breakdowns (seeds, fertilizer, labor, irrigation, pest management, machinery, transport).
- **8-Stage Crop Lifecycle Manager**: Transitions seamlessly from Farm Planner to Crop Manager (`PLANTING` → `GERMINATION` → `EARLY_GROWTH` → `VEGETATIVE` → `FLOWERING` → `FRUITING` → `MATURATION` → `HARVEST`) with auto-generated milestone tasks and physical observation logs.
- **Weather-Aware Decision Engine**: Live meteorological integration via Open-Meteo API. Translates precipitation forecasts, humidity, and heat index into actionable field operations (holding scheduled irrigation during rainfall, clearing drainage, and preventing disease).
- **Audited Expense Ledger**: Complete CRUD expense tracking with category breakdowns (`SEEDS`, `FERTILIZER`, `LABOUR`, `IRRIGATION`, etc.), live capital budget utilization tracking, and date/category filtering.
- **Government Support Discovery**: Curated, verified database of central and state agricultural support schemes (PMFBY Crop Insurance, PM-KISAN, PMKSY Micro-irrigation, Kisan Credit Card, SMAM, PKVY) with personalized relevance matching and document checklists.
- **Grounded AI Farm Assistant & Audit History**: Interactive conversational assistant grounded exclusively in real database records, with an auditable user-isolated log of all Gemini reasoning queries and validated JSON outputs.

---

## 3. Architecture & Security Controls
- **Zero Frontend Secrets**: The React frontend never touches `GEMINI_API_KEY`, `JWT_SECRET`, or database credentials. All AI reasoning is executed strictly on the Express backend.
- **Strict Row Level Data Isolation**: Client-supplied `userId` values are rejected. Every database query checks ownership against the authenticated JWT session. User A cannot view, modify, or query User B's farms, crop cycles, expenses, or AI history.
- **Zod Schema Validation**: All incoming requests and all Gemini model responses are parsed and validated with Zod before database persistence.
- **Dual PostgreSQL Engine**: Connects to standard PostgreSQL (`pg.Pool`) when `DATABASE_URL` is set, and seamlessly falls back to embedded persistent PostgreSQL WebAssembly (`PGlite`) for zero-config local evaluation.

---

## 4. Technology Stack
| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router DOM, Tailwind CSS, Lucide React, Framer Motion, Axios |
| **Backend** | Node.js (ES Modules), Express.js, Helmet, CORS, Express Rate Limit, Cookie Parser |
| **Database** | PostgreSQL 15/16, `@electric-sql/pglite` (embedded persistent fallback) |
| **Authentication** | bcrypt (password hashing), jsonwebtoken (JWT Bearer & HTTP-only cookies) |
| **AI Integration** | Official `@google/genai` SDK |
| **Validation** | Zod (schemas on all API routes and AI structured outputs) |

---

## 5. Quick Start (Running Locally)

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/KissanSathi.git
   cd KissanSathi
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies in both backend and frontend:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

4. Run database migrations & seed verified government schemes:
   ```bash
   cd ../server
   npm run migrate
   npm run seed
   ```

5. Start development servers:
   - **Backend**:
     ```bash
     cd server && npm run dev
     ```
     Server starts on `http://localhost:5000` (Health endpoint: `http://localhost:5000/api/health`)
   - **Frontend**:
     ```bash
     cd client && npm run dev
     ```
     Client starts on `http://localhost:5173`

---

## 6. Testing & Quality Assurance
Run the automated integration and ownership isolation test suite:
```bash
cd server
npm test
```
The test suite validates:
- System health checks
- User registration and bcrypt password hashing
- Session authentication and JWT verification
- **User A vs User B ownership isolation** (User B receives `404 Not Found` trying to access User A's farm)
- Gemini AI structured output Zod schema validation
- Deterministic business plan calculations (`Net = Revenue - Total Cost`)
- Milestone crop lifecycle tasks
- Itemized expense tracking and category summaries
- Grounded AI farm assistant and user-isolated history

---

## 7. Judge / Evaluator Demo Credentials
For instant 1-click evaluation:
- **Email**: `demo.farmer@kisansaarthi.in`
- **Password**: `KisanDemo@2026`
*(Or click the "One-Click Judge Demo Login" button directly on the `/login` page).*

---

## 8. Deployment on Replit
1. Import this repository into Replit.
2. In Replit Secrets, configure:
   - `JWT_SECRET`: A secure random string (minimum 32 characters)
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `DATABASE_URL`: (Optional) Replit PostgreSQL or external Postgres connection string
3. Click **Run**. Replit will run `npm run start:prod` and serve the full-stack application on port 5000.

---

## 9. License
This project is licensed under the MIT License.
