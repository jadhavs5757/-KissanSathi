# KisanSaarthi AI — API Specification

## Base URL
`/api`

All protected endpoints require an `Authorization: Bearer <token>` header or a verified `token` HTTP-only cookie.

---

## 1. Authentication & Profile
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Creates new farmer account (hashes password with bcrypt) |
| `POST` | `/api/auth/login` | No | Validates credentials and returns JWT token |
| `POST` | `/api/auth/logout` | Yes | Clears session cookie |
| `GET` | `/api/auth/me` | Yes | Returns current authenticated user record |
| `GET` | `/api/profile` | Yes | Retrieves user profile and localization |
| `PATCH` | `/api/profile` | Yes | Updates name, phone, language preference, location |

---

## 2. Farm Management
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/farms` | Yes | Lists all farms owned by the authenticated user |
| `POST` | `/api/farms` | Yes | Creates new farm profile (land, soil, water, budget) |
| `GET` | `/api/farms/:farmId` | Yes | Retrieves farm details by ID (enforces ownership) |
| `PATCH` | `/api/farms/:farmId` | Yes | Updates farm information |
| `DELETE` | `/api/farms/:farmId` | Yes | Permanently deletes farm and cascade dependencies |

---

## 3. Crop Planning & Business Scenarios
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/farms/:farmId/analyze` | Yes | Triggers Gemini AI crop recommendation reasoning |
| `GET` | `/api/farms/:farmId/crop-plans` | Yes | Lists saved crop recommendations for the farm |
| `GET` | `/api/farms/:farmId/crop-plans/:planId` | Yes | Retrieves individual crop recommendation details |
| `POST` | `/api/farms/:farmId/business-plans` | Yes | Computes deterministic Conservative, Expected, and Favorable scenarios |
| `GET` | `/api/farms/:farmId/business-plans` | Yes | Lists business plans generated for the farm |
| `GET` | `/api/farms/:farmId/business-plans/:planId` | Yes | Retrieves business plan with itemized cost breakdowns |

---

## 4. Crop Lifecycle & Field Management
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/farms/:farmId/crop-cycles` | Yes | Lists active and historical crop cycles |
| `POST` | `/api/farms/:farmId/crop-cycles` | Yes | Initializes crop cycle and auto-generates milestone tasks |
| `GET` | `/api/farms/:farmId/crop-cycles/:cycleId` | Yes | Retrieves crop control center details & stage progression |
| `PATCH` | `/api/farms/:farmId/crop-cycles/:cycleId` | Yes | Updates current growth stage (PLANTING to HARVEST) |
| `DELETE` | `/api/farms/:farmId/crop-cycles/:cycleId` | Yes | Deletes crop cycle |
| `GET` | `/api/crop-cycles/:cycleId/tasks` | Yes | Lists milestone tasks for the crop cycle |
| `POST` | `/api/crop-cycles/:cycleId/tasks` | Yes | Creates custom task |
| `PATCH` | `/api/crop-cycles/:cycleId/tasks/:taskId` | Yes | Toggles task status (PENDING / COMPLETED) |
| `GET` | `/api/crop-cycles/:cycleId/observations` | Yes | Lists farm observations (scouting, pest checks) |
| `POST` | `/api/crop-cycles/:cycleId/observations` | Yes | Logs field observation with severity rating |

---

## 5. Expenses Ledger
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/farms/:farmId/expenses` | Yes | Lists expenses with category, date, and search filters |
| `POST` | `/api/farms/:farmId/expenses` | Yes | Records new expense line item |
| `PATCH` | `/api/farms/:farmId/expenses/:expenseId` | Yes | Modifies existing expense entry |
| `DELETE` | `/api/farms/:farmId/expenses/:expenseId` | Yes | Removes expense entry |

---

## 6. Weather & Action Translation
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/farms/:farmId/weather` | Yes | Fetches live Open-Meteo meteorological forecast |
| `POST` | `/api/farms/:farmId/weather-action` | Yes | Translates weather conditions into contextual field actions |

---

## 7. Government Schemes & AI Assistant
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/schemes` | Yes | Lists all verified national agricultural schemes |
| `GET` | `/api/farms/:farmId/schemes` | Yes | Annotates schemes with relevance to the farm profile |
| `POST` | `/api/ai/assistant` | Yes | Contextual AI reasoning grounded in real farm records |
| `GET` | `/api/ai/history` | Yes | User-isolated audit trail of past AI queries and outputs |
| `GET` | `/api/ai/history/:historyId` | Yes | Inspects full input context and validated JSON response |
| `GET` | `/api/health` | No | System health check (`{"status":"ok"}`) |
