# CentaurClinical DZ — Backend API

REST API for the CentaurClinical DZ hospital management system.  
Built with **Node.js**, **Express**, **TypeScript**, **Knex.js**, and **PostgreSQL**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Installation & Setup](#3-installation--setup)
4. [Environment Variables](#4-environment-variables)
5. [Database Setup](#5-database-setup)
6. [Loading Demo Data (Seeds)](#6-loading-demo-data-seeds)
7. [Running the Server](#7-running-the-server)
8. [Running the Tests](#8-running-the-tests)
9. [Project Architecture](#9-project-architecture)
10. [Database Schema](#10-database-schema)
11. [API Reference](#11-api-reference)
12. [Authentication Flow](#12-authentication-flow)
13. [Error Response Format](#13-error-response-format)
14. [Docker](#14-docker)
15. [SQL Export](#15-sql-export)

---

## 1. Project Overview

CentaurClinical DZ is a backend API for managing patient records across four hospital service departments:

| Service | Description |
|---|---|
| `general` | General medicine patients (common fields only) |
| `urgence` | Emergency patients with triage-specific data |
| `oncologie` | Oncology patients with tumour and treatment data |
| `cardiologie` | Cardiology patients with ECG and cardiac metrics |

Authentication is handled with **JWT access + refresh token rotation**. All patient endpoints require a valid Bearer access token.

---

## 2. Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20.x |
| npm | 10.x |
| PostgreSQL | 14+ |

---

## 3. Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd CentaurClinicalDZ

# Install all dependencies
npm install

# Copy the environment template and fill in your values
cp .env.example .env
```

Edit `.env` with your local database credentials and JWT secrets (see [Section 4](#4-environment-variables)).

---

## 4. Environment Variables

All configuration is loaded from the `.env` file at startup via `dotenv`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP port the server listens on |
| `NODE_ENV` | No | `development` | Runtime environment: `development`, `production`, or `test` |
| `CORS_ORIGIN` | No | `http://localhost:8080,http://localhost:3000` | Comma-separated list of allowed CORS origins. Use `*` to allow all. |
| `DB_HOST` | No | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_USER` | No | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | No | `postgres` | PostgreSQL password |
| `DB_NAME` | No | `centaur_auth` | PostgreSQL database name. In `test` mode the suffix `_test` is appended automatically. |
| `DB_SSL` | No | `false` | Set to `true` to enable SSL for the database connection |
| `JWT_ACCESS_SECRET` | **Yes** | dev fallback | Secret used to sign access tokens. Must be at least 32 characters in production. |
| `JWT_REFRESH_SECRET` | **Yes** | dev fallback | Secret used to sign refresh tokens. Must be different from the access secret. |
| `JWT_ACCESS_EXPIRATION` | No | `15m` | Access token lifetime (e.g. `15m`, `1h`) |
| `JWT_REFRESH_EXPIRATION` | No | `7d` | Refresh token lifetime (e.g. `7d`, `30d`) |
| `BCRYPT_SALT_ROUNDS` | No | `10` | bcrypt cost factor for password hashing |

**Example `.env`:**

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8080,http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=centaur_auth

JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_at_least_32_chars_long
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_at_least_32_chars_long
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

BCRYPT_SALT_ROUNDS=10
```

> **Security note:** Never commit real secrets to version control. The `.env` file is listed in `.gitignore`.

---

## 5. Database Setup

### Create the database

```sql
-- Run in psql or your preferred PostgreSQL client
CREATE DATABASE centaur_auth;
```

### Run migrations

Migrations live in `src/database/migrations/` and are managed by Knex.

```bash
# Apply all pending migrations
npm run migrate:latest

# Roll back the last batch
npm run migrate:rollback
```

**What the migrations create:**

| Migration file | Tables created |
|---|---|
| `20260923000001_create_users_table.ts` | `users` |
| `20260923000002_create_refresh_tokens_table.ts` | `refresh_tokens` |
| `20260925000003_create_patients_tables.ts` | `patients`, `urgence`, `oncologie`, `cardiologie` + `patient_service` enum |
| `20260927000004_update_oncologie_stage_to_integer.ts` | Converts `oncologie.stade` to integer and constrains it to 1–4 |

> The server also runs `migrate:latest` automatically on startup as a convenience, so manual migration is only required if you need the database ready before starting the server.

### Prepare the database for login

Run both the migrations and seeds to create the demo account and sample patient data:

```bash
npm run migrate:latest
npm run seed:run
```

Demo login credentials:

| Username | Password |
|---|---|
| `maroua` | `TestTest01` |

The demo user's password is stored as a bcrypt hash using the same password-hashing utility as normal registration. Re-running the seeds keeps these credentials usable.

---

## 6. Loading Demo Data (Seeds)

The seeds create the `maroua` demo login and insert 8 demo patients across all four services. The demo user seed is idempotent and ensures its published password remains current. The patient seed clears existing patient data before inserting, so it is also safe to run multiple times.

```bash
npm run seed:run
```

**Demo patients inserted:**

| Nom | Prenom | Service | Date hospitalisation |
|---|---|---|---|
| Benali | Amina | general | 2026-09-10 |
| Kaci | Youcef | general | 2026-09-15 |
| Hamidi | Sonia | urgence | 2026-09-20 |
| Messaoud | Rachid | urgence | 2026-09-22 |
| Touati | Leila | oncologie | 2026-08-01 |
| Aissaoui | Karim | oncologie | 2026-08-15 |
| Zerrouk | Omar | cardiologie | 2026-09-05 |
| Boudiaf | Fatima | cardiologie | 2026-09-18 |

---

## 7. Running the Server

### Development (hot-reload with `ts-node-dev`)

```bash
npm run dev
```

The server starts on `http://localhost:5000` (or the `PORT` value in `.env`).

### Production

```bash
# Compile TypeScript to JavaScript
npm run build

# Start the compiled server
npm start
```

---

## 8. Running the Tests

Tests use **Jest** with **Supertest** for HTTP integration testing. All tests run against **in-memory mocks** — no running database is needed.

```bash
npm test
```

**Test suites:**

| File | What it covers |
|---|---|
| `tests/api.test.ts` | Full E2E auth endpoint tests (register, login, logout, token rotation, protected `/api/auth/me`) |
| `tests/auth.service.test.ts` | `AuthService` business logic unit tests |
| `tests/patient.test.ts` | Patient `GET`, `PATCH`, and `DELETE` endpoints plus service behavior |
| `tests/utils.test.ts` | JWT signing/verification and password hashing utilities |

**Current coverage: 93 tests across 4 suites, all passing.**

---

## 9. Project Architecture

The project follows a **layered clean architecture**:

```
src/
├── app.ts                  # Express app factory (middleware, routing)
├── server.ts               # HTTP server bootstrap, graceful shutdown
├── config/
│   └── index.ts            # Typed config loaded from env vars
├── routes/
│   ├── index.ts            # Root router (/api/health, /api/auth, /api/patients)
│   ├── auth.routes.ts      # Auth endpoint definitions
│   └── patient.routes.ts   # Patient endpoint definitions
├── controllers/
│   ├── auth.controller.ts  # HTTP layer — auth request/response handling
│   ├── user.controller.ts  # HTTP layer — current user profile
│   └── patient.controller.ts # HTTP layer — patient queries
├── services/
│   ├── auth.service.ts     # Business logic — registration, login, token rotation, logout
│   ├── user.service.ts     # Business logic — user lookup
│   └── patient.service.ts  # Business logic — delegates to repository
├── repositories/
│   ├── user.repository.ts          # Data access — users table
│   ├── refresh-token.repository.ts # Data access — refresh_tokens table
│   └── patient.repository.ts       # Data access — patients + service joins
├── middleware/
│   ├── auth.middleware.ts    # JWT Bearer token verification, attaches req.user
│   ├── validate.middleware.ts # Zod schema validation for body and query
│   ├── error.middleware.ts   # Centralized error serializer
│   └── not-found.middleware.ts # 404 fallback handler
├── models/
│   ├── user.model.ts         # User and SafeUser interfaces
│   ├── token.model.ts        # TokenPayload, AuthTokens, RefreshToken interfaces
│   └── patient.model.ts      # Patient, service-detail, and joined type definitions
├── utils/
│   ├── jwt.util.ts           # signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken
│   ├── crypto.util.ts        # hashPassword, comparePassword, hashToken (SHA-256)
│   └── errors.util.ts        # AppError hierarchy (BadRequestError, UnauthorizedError, etc.)
└── database/
    ├── connection.ts              # Knex connection pool singleton
    ├── migrations/                # Versioned schema migrations
    └── seeds/
        └── 01_patients_demo.ts   # Demo patient data
```

### Layer responsibilities

| Layer | Responsibility |
|---|---|
| **Routes** | Declare endpoints, apply middleware chain, wire to controller methods |
| **Controllers** | Parse HTTP request, call service, return serialized response |
| **Services** | Enforce business rules (password hashing, token rotation, conflict detection) |
| **Repositories** | Execute SQL queries via Knex; return typed domain objects |
| **Middleware** | Cross-cutting concerns: auth, validation, error handling, 404 |
| **Models** | TypeScript interfaces — shared between all layers |
| **Utils** | Pure functions: JWT operations, crypto, error classes |

---

## 10. Database Schema

### Entity-relationship overview

```
users
  └── refresh_tokens   (FK: user_id → users.id, CASCADE DELETE)

patients
  ├── urgence          (FK: patient_id → patients.id, CASCADE DELETE/UPDATE)
  ├── oncologie        (FK: patient_id → patients.id, CASCADE DELETE/UPDATE)
  └── cardiologie      (FK: patient_id → patients.id, CASCADE DELETE/UPDATE)
```

### `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `username` | `varchar(50)` | NOT NULL, UNIQUE, indexed |
| `password_hash` | `varchar(255)` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

### `refresh_tokens`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → `users.id` CASCADE DELETE, indexed |
| `token_hash` | `varchar(64)` | NOT NULL, UNIQUE, indexed — SHA-256 hex of the raw JWT |
| `expires_at` | `timestamptz` | NOT NULL |
| `revoked` | `boolean` | NOT NULL, default `false`, indexed |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### `patients` (common fields)

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `nom` | `varchar(100)` | NOT NULL |
| `prenom` | `varchar(100)` | NOT NULL |
| `date_hospitalisation` | `date` | NOT NULL — stored as `YYYY-MM-DD` |
| `service` | `patient_service` enum | NOT NULL, indexed — one of `general`, `urgence`, `oncologie`, `cardiologie` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

### `urgence` (1-to-1 with `patients`)

| Column | Type | Constraints |
|---|---|---|
| `patient_id` | `uuid` | PK, FK → `patients.id` CASCADE |
| `heure_arrivee` | `time` | NOT NULL — `HH:mm` or `HH:mm:ss` |
| `niveau_triage` | `integer` | NOT NULL, CHECK 1–5 (1 = critical, 5 = non-urgent) |
| `gravite_initiale` | `varchar(100)` | NOT NULL |

### `oncologie` (1-to-1 with `patients`)

| Column | Type | Constraints |
|---|---|---|
| `patient_id` | `uuid` | PK, FK → `patients.id` CASCADE |
| `type_tumeur` | `varchar(150)` | NOT NULL |
| `stade` | `integer` | NOT NULL, CHECK 1–4 |
| `traitement_en_cours` | `varchar(255)` | NOT NULL |

### `cardiologie` (1-to-1 with `patients`)

| Column | Type | Constraints |
|---|---|---|
| `patient_id` | `uuid` | PK, FK → `patients.id` CASCADE |
| `resultats_ecg` | `varchar(255)` | NOT NULL |
| `frequence_cardiaque_repos` | `integer` | NOT NULL — BPM |
| `tension_arterielle` | `varchar(20)` | NOT NULL — e.g. `120/80` |

---

## 11. API Reference

**Base URL:** `http://localhost:5000/api`

All successful responses use the envelope:

```json
{ "status": "success", "statusCode": 200, "data": { ... } }
```

All error responses use the envelope:

```json
{ "status": "error", "statusCode": 400, "message": "...", "details": [...] }
```

`details` (field-level validation errors) is only present on `400` responses.

### Endpoint summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server health check |
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Authenticate with credentials |
| `POST` | `/api/auth/refresh` | No | Rotate refresh token |
| `POST` | `/api/auth/logout` | No | Revoke refresh token |
| `GET` | `/api/auth/me` | Bearer | Current user profile |
| `GET` | `/api/patients?service=<service>` | Bearer | Patients by service department |
| `POST` | `/api/patients` | Bearer | Create a patient for a service |
| `PATCH` | `/api/patients/:id` | Bearer | Update patient fields by ID |
| `DELETE` | `/api/patients/:id` | Bearer | Delete a patient by ID |

---

### GET /api/health

No authentication required.

**Response 200:**
```json
{ "status": "ok", "uptime": 123.45, "timestamp": "2026-09-25T20:00:00.000Z" }
```

---

### POST /api/auth/register

**Body:**

| Field | Type | Rules |
|---|---|---|
| `username` | string | 3–30 chars, `[a-zA-Z0-9_]` only |
| `password` | string | 8–128 chars |

**Response 201:**
```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "user": { "id": "uuid", "username": "dr_smith", "created_at": "...", "updated_at": "..." },
    "tokens": { "accessToken": "<jwt>", "refreshToken": "<jwt>" }
  }
}
```

**Errors:** `400` validation failed · `409` username already taken

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"dr_smith","password":"SecurePass123!"}'
```

---

### POST /api/auth/login

**Body:**

| Field | Type | Rules |
|---|---|---|
| `username` | string | required, non-empty |
| `password` | string | required, non-empty |

**Response 200:** same shape as register response with `statusCode: 200`.

**Errors:** `400` validation failed · `401` Invalid username or password

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dr_smith","password":"SecurePass123!"}'
```

---

### POST /api/auth/refresh

Revokes the provided refresh token and issues a brand-new token pair. Replaying the old token returns `401`.

**Body:**

| Field | Type |
|---|---|
| `refreshToken` | string (current refresh JWT) |

**Response 200:** same `data.user` + `data.tokens` envelope.

**Errors:** `400` missing token · `401` invalid / expired / revoked token

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<current_refresh_jwt>"}'
```

---

### POST /api/auth/logout

Revokes the refresh token server-side. The access token continues to be accepted until it expires naturally.

**Body:** `{ "refreshToken": "<jwt>" }`

**Response 200:**
```json
{ "status": "success", "statusCode": 200, "message": "Logged out successfully" }
```

**Errors:** `400` missing or empty token

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_jwt>"}'
```

---

### GET /api/auth/me

Returns the authenticated user's profile. `password_hash` is never returned.

**Header:** `Authorization: Bearer <access_token>`

**Response 200:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "user": { "id": "uuid", "username": "dr_smith", "created_at": "...", "updated_at": "..." }
  }
}
```

**Errors:** `401` missing header · `401` invalid format · `401` invalid token · `401` token expired

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

### POST /api/patients

Creates a patient and its service-specific details. Include the common patient fields and the required details for the selected service. All patient endpoints require a valid access token.

**Header:** `Authorization: Bearer <access_token>`

**Common body fields:** `nom` (1–100 character string), `prenom` (1–100 character string), and `date_hospitalisation` (valid `YYYY-MM-DD` date). The `service` field must be `general`, `urgence`, `oncologie`, or `cardiologie`.

**Service-specific fields:**

| Service | Required fields |
|---|---|
| `general` | No additional fields |
| `urgence` | `heure_arrivee` (`HH:mm` or `HH:mm:ss`), `niveau_triage` (integer 1–5; 1 = critical, 5 = non-urgent), `gravite_initiale` (1–100 character string) |
| `oncologie` | `type_tumeur` (1–150 character string), `stade` (integer 1–4), `traitement_en_cours` (1–255 character string) |
| `cardiologie` | `resultats_ecg` (1–255 character string), `frequence_cardiaque_repos` (positive integer), `tension_arterielle` (1–20 character string) |

**Request examples:**

```json
{ "service": "general", "nom": "Benali", "prenom": "Amina", "date_hospitalisation": "2026-09-27" }
```

```json
{
  "service": "urgence", "nom": "Hamidi", "prenom": "Sonia", "date_hospitalisation": "2026-09-27",
  "heure_arrivee": "08:45:00", "niveau_triage": 2, "gravite_initiale": "Douleur thoracique"
}
```

```json
{
  "service": "oncologie", "nom": "Touati", "prenom": "Leila", "date_hospitalisation": "2026-09-27",
  "type_tumeur": "Carcinome mammaire", "stade": 2, "traitement_en_cours": "Chimiothérapie"
}
```

```json
{
  "service": "cardiologie", "nom": "Zerrouk", "prenom": "Omar", "date_hospitalisation": "2026-09-27",
  "resultats_ecg": "Rythme sinusal", "frequence_cardiaque_repos": 72, "tension_arterielle": "120/80"
}
```

**Response 201:** returns the created patient, including its generated ID and service-specific fields, in the standard success envelope.

```json
{
  "status": "success",
  "statusCode": 201,
  "data": {
    "id": "<generated_patient_uuid>",
    "nom": "Benali",
    "prenom": "Amina",
    "date_hospitalisation": "2026-09-27",
    "service": "general",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Errors:** `400` missing or invalid fields for the selected service · `401` missing, invalid, or expired access token

---

### GET /api/patients?service=\<service\>

Returns all patients for the given service, including service-specific fields.

**Header:** `Authorization: Bearer <access_token>`

**Query param:** `service` — one of `general`, `urgence`, `oncologie`, `cardiologie` (required)

**Response 200 — general:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "service": "general",
    "count": 2,
    "patients": [
      {
        "id": "uuid",
        "nom": "Benali",
        "prenom": "Amina",
        "date_hospitalisation": "2026-09-10",
        "service": "general",
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  }
}
```

**Response 200 — urgence** (adds `heure_arrivee`, `niveau_triage`, `gravite_initiale`):
```json
{
  "data": {
    "service": "urgence",
    "count": 2,
    "patients": [
      {
        "nom": "Hamidi", "prenom": "Sonia",
        "date_hospitalisation": "2026-09-20",
        "service": "urgence",
        "heure_arrivee": "08:45:00",
        "niveau_triage": 2,
        "gravite_initiale": "Douleur thoracique aigue"
      }
    ]
  }
}
```

**Response 200 — oncologie** (adds `type_tumeur`, `stade`, `traitement_en_cours`):
```json
{
  "data": {
    "service": "oncologie",
    "patients": [
      {
        "nom": "Touati", "prenom": "Leila",
        "date_hospitalisation": "2026-08-01",
        "type_tumeur": "Carcinome mammaire",
        "stade": 2,
        "traitement_en_cours": "Chimiotherapie - Cycle 3"
      }
    ]
  }
}
```

**Response 200 — cardiologie** (adds `resultats_ecg`, `frequence_cardiaque_repos`, `tension_arterielle`):
```json
{
  "data": {
    "service": "cardiologie",
    "patients": [
      {
        "nom": "Zerrouk", "prenom": "Omar",
        "date_hospitalisation": "2026-09-05",
        "resultats_ecg": "Fibrillation auriculaire",
        "frequence_cardiaque_repos": 92,
        "tension_arterielle": "145/95"
      }
    ]
  }
}
```

**Errors:** `400` missing or invalid `service` · `401` auth errors (same as `/api/auth/me`)

```bash
curl "http://localhost:5000/api/patients?service=urgence" \
  -H "Authorization: Bearer <access_token>"
```

---

### PATCH /api/patients/:id

Updates only the fields included in the request body. At least one field is required. The patient ID is the UUID in the `patients` record; `id` and `service` cannot be changed through this endpoint.

**Header:** `Authorization: Bearer <access_token>`

**Body:** any non-empty subset of the following fields:

| Field | Type | Rules |
|---|---|---|
| `nom` | string | 1–100 characters |
| `prenom` | string | 1–100 characters |
| `date_hospitalisation` | string | `YYYY-MM-DD` |
| `heure_arrivee` | string | `HH:mm` or `HH:mm:ss`; only for `urgence` patients |
| `gravite_initiale` | string | 1–100 characters; only for `urgence` patients |
| `type_tumeur` | string | 1–150 characters; only for `oncologie` patients |
| `traitement_en_cours` | string | 1–255 characters; only for `oncologie` patients |
| `stade` | integer | 1–4; only for `oncologie` patients |
| `niveau_triage` | integer | 1–5; only for `urgence` patients (1 = critical, 5 = non-urgent) |
| `resultats_ecg` | string | 1–255 characters; only for `cardiologie` patients |
| `frequence_cardiaque_repos` | integer | Positive; only for `cardiologie` patients |
| `tension_arterielle` | string | 1–20 characters; only for `cardiologie` patients |

Example body:
```json
{ "nom": "Benali Updated" }
```

**Response 200:** returns the patient ID and the fields updated.
```json
{
  "status": "success",
  "statusCode": 200,
  "data": { "id": "<patient_uuid>", "nom": "Benali Updated" }
}
```

**Errors:** `400` empty body, unsupported field, invalid value, or specialty field for the wrong service · `401` missing, invalid, or expired access token · `404` no patient exists with the given ID

```bash
curl -X PATCH http://localhost:5000/api/patients/<patient_uuid> \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"nom":"Benali Updated"}'
```

---

### DELETE /api/patients/:id

Deletes the patient with the given ID, including its service-specific details. The endpoint requires a valid access token. The patient ID is the UUID in the `patients` record.

**Header:** `Authorization: Bearer <access_token>`

**Response 200:**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": { "id": "<patient_uuid>" }
}
```

**Errors:** `401` missing, invalid, or expired access token · `404` no patient exists with the given ID

```bash
curl -X DELETE http://localhost:5000/api/patients/<patient_uuid> \
  -H "Authorization: Bearer <access_token>"
```

---

## 12. Authentication Flow

### Registration / Login

```
Client                              Server
  |                                    |
  |-- POST /api/auth/register -------->|  Hash password (bcrypt)
  |                                    |  Create user record
  |                                    |  Sign accessToken (JWT, 15m, accessSecret)
  |                                    |  Sign refreshToken (JWT, 7d, refreshSecret)
  |                                    |  Store SHA-256(refreshToken) in refresh_tokens
  |<-- 201 { user, tokens } ----------|
```

### Using access tokens

Include the access token as a Bearer token on every protected request:

```
Authorization: Bearer <accessToken>
```

The `authenticate` middleware validates the header format, verifies the JWT signature and expiry, then attaches `{ userId, username }` to `req.user`.

### Token rotation (refresh)

```
Client                              Server
  |                                    |
  |-- POST /api/auth/refresh --------->|  Verify refreshToken JWT signature + expiry
  |   { refreshToken }                 |  Look up SHA-256(refreshToken) in DB
  |                                    |  Verify token is not revoked
  |                                    |  Revoke old token (revoked = true)
  |                                    |  Issue new accessToken + refreshToken
  |                                    |  Store new token hash in DB
  |<-- 200 { user, newTokens } -------|
```

Replaying the revoked token returns `401 Invalid or revoked refresh token`.

### Security design decisions

- Refresh tokens are **never stored raw** in the database — only their **SHA-256 hash**.
- Each JWT includes a unique `jwtid` (UUID) to prevent hash collisions between tokens.
- The access and refresh tokens use **separate secrets** (`JWT_ACCESS_SECRET` vs `JWT_REFRESH_SECRET`), so a refresh token submitted to an access-token endpoint is rejected as invalid.
- Logout is server-side: the token hash is marked `revoked = true` in the database immediately.

---

## 13. Error Response Format

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "details": [
    { "field": "username", "message": "Username must be at least 3 characters long" },
    { "field": "password", "message": "Password must be at least 8 characters long" }
  ]
}
```

`details` is only present on `400` validation errors. In `development` mode, a `stack` field is also included.

| Error class | HTTP status |
|---|---|
| `BadRequestError` | 400 |
| `UnauthorizedError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `InternalServerError` | 500 |

---

## 14. Docker

A `docker-compose.yml` is provided that runs PostgreSQL and the Node.js app together.

```bash
# Build and start (first run compiles the image)
docker-compose up --build

# Detached
docker-compose up -d --build

# Stop
docker-compose down

# Stop and erase volume (all DB data)
docker-compose down -v
```

The app container runs `migrate:latest` automatically on startup. To load demo data:

```bash
docker exec -it centaur_auth_app npm run seed:run
```

Override any environment variable by adding it to a `.env` file next to `docker-compose.yml`.

---

## 15. SQL Export

The file **`database_export.sql`** in this repository contains a complete PostgreSQL dump of the `centaur_auth` database — schema, constraints, indexes, the `patient_service` enum, and all seeded patient records.

It was generated with:

```bash
pg_dump --no-owner --no-acl -U postgres -h localhost -d centaur_auth -f database_export.sql
```

### Recreate the database from the SQL file

```bash
# 1. Create a fresh target database
psql -U postgres -c "CREATE DATABASE centaur_auth;"

# 2. Import everything in one step
psql -U postgres -d centaur_auth -f database_export.sql
```

This restores the complete structure and demo data without needing to run migrations or seeds separately.

> The dump does not include `users` or `refresh_tokens` rows, as those are runtime data created after deployment.