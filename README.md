# Centaur Clinical Authentication Backend

A robust, production-ready authentication backend built with **Node.js**, **Express.js**, **TypeScript**, **PostgreSQL**, and **Knex.js**, fully containerized with **Docker** and **Docker Compose**.

---

## Architecture & Design Principles

The application strictly implements a **layered clean architecture** adhering to **SOLID** and **clean-code** principles:

```
           HTTP Requests
                 │
                 ▼
┌─────────────────────────────────┐
│          Routes Layer           │  (src/routes/)
│  - Endpoint definitions         │
│  - Middleware attachment        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        Controllers Layer        │  (src/controllers/)
│  - HTTP boundary                │
│  - Request / response mapping   │
│  - Status codes (200, 201, etc.)│
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│         Services Layer          │  (src/services/)
│  - Business logic               │
│  - Password hashing & checks    │
│  - JWT token generation         │
│  - Token rotation & revocation  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       Repositories Layer        │  (src/repositories/)
│  - Data access abstraction      │
│  - Encapsulates all SQL queries │
│  - Zero business logic          │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        Knex / PostgreSQL        │  (src/database/)
│  - Connection pooling           │
│  - Database schema & migrations │
└─────────────────────────────────┘
```

### Layer Responsibilities
- **Single Responsibility Principle (SRP)**: Each layer and class does exactly one thing. Business logic never touches SQL queries or HTTP response objects directly.
- **Dependency Inversion Principle (DIP)**: Services depend on repository interfaces (`IUserRepository`, `IRefreshTokenRepository`), allowing mock implementations for fast, deterministic unit and integration tests.
- **Fail-Safe Centralized Error Handling**: Errors propagate cleanly via custom `AppError` subclasses to a centralized error middleware, returning standard, predictable JSON.

---

## Token Strategy & Security

### 1. Dual-Token Architecture
- **Access Token (Short-Lived: 15 minutes)**:
  - Format: Signed JWT (`HS256`).
  - Payload: `{ sub: "<user-id>", username: "<username>" }`.
  - Usage: Sent in the `Authorization: Bearer <token>` header for protected endpoints (`/me`).
  - Validation: Stateless HMAC verification via `JWT_ACCESS_SECRET`. Fast and database-free.

- **Refresh Token (Long-Lived: 7 days)**:
  - Format: Signed JWT (`HS256`) with `JWT_REFRESH_SECRET`.
  - Storage: Stored **hashed (SHA-256)** in PostgreSQL `refresh_tokens` table.
  - Security Benefit: If the database is compromised, the raw refresh tokens cannot be used by an attacker to authenticate.

### 2. Token Rotation
When a user calls `POST /api/auth/refresh`:
1. The incoming refresh token is verified for cryptographic validity and expiration.
2. The token hash is looked up in the database.
3. The old refresh token is **immediately revoked** (`revoked = true`).
4. A brand new Access Token and a brand new Refresh Token pair is generated, hashed, and returned.
5. Reusing a revoked token results in an immediate `401 Unauthorized`.

### 3. Logout & Invalidation
Calling `POST /api/auth/logout`:
- Marks the provided refresh token as `revoked = true` in the database.
- Any subsequent attempt to refresh using that token is rejected.

---

## Directory Structure

```
.
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── knexfile.ts
├── package.json
├── tsconfig.json
├── jest.config.ts
├── README.md
├── src/
│   ├── app.ts                         # Express application setup & middleware wiring
│   ├── server.ts                      # Server bootstrap, migration check, graceful shutdown
│   ├── config/
│   │   └── index.ts                   # Typed environment configuration
│   ├── controllers/
│   │   ├── auth.controller.ts         # Handlers for register, login, refresh, logout
│   │   └── user.controller.ts         # Handler for /me profile endpoint
│   ├── database/
│   │   ├── connection.ts              # Knex query builder client instance
│   │   └── migrations/
│   │       ├── 20260923000001_create_users_table.ts
│   │       └── 20260923000002_create_refresh_tokens_table.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts         # Bearer JWT verification middleware
│   │   ├── error.middleware.ts        # Centralized error handler
│   │   ├── not-found.middleware.ts    # 404 handler
│   │   └── validate.middleware.ts     # Zod request body validation middleware
│   ├── models/
│   │   ├── token.model.ts             # Token & payload domain interfaces
│   │   └── user.model.ts              # User domain interfaces
│   ├── repositories/
│   │   ├── refresh-token.repository.ts# Knex data access for refresh_tokens
│   │   └── user.repository.ts         # Knex data access for users
│   ├── routes/
│   │   ├── auth.routes.ts             # Route definitions for auth & /me
│   │   └── index.ts                   # Root API router
│   ├── services/
│   │   ├── auth.service.ts            # Auth business logic (register, login, refresh, logout)
│   │   └── user.service.ts            # User business logic
│   └── utils/
│       ├── crypto.util.ts             # bcryptjs and SHA-256 helpers
│       ├── errors.util.ts             # Custom domain error classes
│       └── jwt.util.ts                # JWT sign and verify helpers
└── tests/
    ├── api.test.ts                    # HTTP API integration tests (Supertest)
    ├── auth.service.test.ts           # Business logic unit tests
    └── utils.test.ts                  # Crypto and JWT tests
```

---

## Setup & Running Instructions

### Option 1: Run with Docker Compose (Recommended)

Requires Docker & Docker Compose installed.

1. **Start all services (PostgreSQL + App):**
   ```bash
   docker compose up --build
   ```
   The backend will automatically wait for PostgreSQL to pass health checks, run database migrations, and start listening on port `5000`.

2. **Stop services:**
   ```bash
   docker compose down
   ```

---

### Option 2: Run Locally (Node.js & Local PostgreSQL)

1. **Prerequisites:**
   - Node.js (v18+ or v20+)
   - PostgreSQL (v14+) running locally

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and set your PostgreSQL credentials:
   ```bash
   cp .env.example .env
   ```
   Ensure the database exists in PostgreSQL:
   ```sql
   CREATE DATABASE centaur_auth;
   ```

4. **Run Database Migrations:**
   ```bash
   npm run migrate:latest
   ```

5. **Start Development Server (with auto-reload):**
   ```bash
   npm run dev
   ```

6. **Build & Start Production Bundle:**
   ```bash
   npm run build
   npm start
   ```

---

## Running Automated Tests

Run the complete test suite (unit + integration tests):
```bash
npm test
```

---

## API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health status | No |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate with credentials | No |
| `POST` | `/api/auth/refresh` | Rotate refresh token | No |
| `POST` | `/api/auth/logout` | Revoke refresh token | No |
| `GET` | `/me` (or `/api/auth/me`) | Current user profile | **Yes (Bearer)** |

---

## Example cURL Commands

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dr_watson",
    "password": "Password123!"
  }'
```
**Response (201 Created):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "7f9c8d10-8b1e-4c12-bf91-7f8e3c834a01",
      "username": "dr_watson",
      "created_at": "2026-09-23T00:00:00.000Z",
      "updated_at": "2026-09-23T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dr_watson",
    "password": "Password123!"
  }'
```
**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "7f9c8d10-8b1e-4c12-bf91-7f8e3c834a01",
      "username": "dr_watson",
      "created_at": "2026-09-23T00:00:00.000Z",
      "updated_at": "2026-09-23T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

### 3. Access Protected `/me` Endpoint
```bash
curl -X GET http://localhost:5000/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```
**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "user": {
      "id": "7f9c8d10-8b1e-4c12-bf91-7f8e3c834a01",
      "username": "dr_watson",
      "created_at": "2026-09-23T00:00:00.000Z",
      "updated_at": "2026-09-23T00:00:00.000Z"
    }
  }
}
```

### 4. Refresh Tokens (Rotation)
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<YOUR_REFRESH_TOKEN>"
  }'
```
**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Tokens refreshed successfully",
  "data": {
    "user": {
      "id": "7f9c8d10-8b1e-4c12-bf91-7f8e3c834a01",
      "username": "dr_watson",
      "created_at": "2026-09-23T00:00:00.000Z",
      "updated_at": "2026-09-23T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

### 5. Logout (Revoke Refresh Token)
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<YOUR_REFRESH_TOKEN>"
  }'
```
**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Logged out successfully"
}
```