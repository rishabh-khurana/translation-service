# Phase 3: Authentication Detailed Plan

## Objective

Deliver secure, production-ready JWT authentication for the translation service, expanding the Phase 3 scope in `PLAN.md` into actionable implementation tasks.

## Authentication Architecture

### Stateless vs Stateful Authentication

When designing authentication systems, there are two primary architectural approaches:


| Aspect              | **Stateful (Session-Based)**                                     | **Stateless (JWT-Based)**                             |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| **Session Storage** | Server stores session data in memory, database, or cache (Redis) | All session data embedded in the token itself         |
| **Validation**      | Server looks up session ID on every request                      | Server validates token signature and decodes claims   |
| **Scalability**     | Requires shared session store across server instances            | Any server instance can validate tokens independently |
| **Token Size**      | Small session ID (e.g., 32 bytes)                                | Larger payload (contains user info, permissions)      |
| **Revocation**      | Easy - delete session from store                                 | Harder - requires blacklist or short expiry           |


### Decision: Stateless (JWT) Authentication

**This application uses a stateless JWT-based authentication system.**

#### Why Stateless for This Translation Service:

- **Scalability**: No centralized session store needed; horizontal scaling is trivial
- **Performance**: Zero database/cache lookups for session validation on each request
- **Simpler Infrastructure**: No Redis or shared session storage required
- **Microservices Ready**: Future services can validate tokens without auth service dependency
- **API-First Design**: Clean separation between client and server; tokens work across web/mobile clients
- **Serverless Compatibility**: Stateless design works well with serverless deployments

#### Trade-offs Accepted:

- **Token Revocation**: Harder to revoke tokens immediately (addressed with reasonable expiry times; client deletes token on logout)
- **Token Size**: Slightly larger request headers (mitigated by minimal JWT payload)
- **No Instant Logout**: Cannot immediately invalidate all user sessions server-side (addressed with token expiry strategy)

## Goal and Scope

### In Scope

- User registration and login with hashed passwords.
- Single long-lived stateless JWT token issuance.
- Token expiry-based session management (no server-side storage).
- Auth middleware for protected endpoints.
- Auth-focused testing across service and route layers.

### Out of Scope

- OAuth/SSO providers.
- Password reset/email verification flows.
- API key-based authentication.
- Role-based access control (no admin role needed).

## Implementation Sub-Phases

### Sub-Phase 3.1: User Registration (`/auth/register`) ✅

**Dependencies:** Database setup complete
**Goal:** Allow users to create accounts with secure password hashing

#### Tasks

- ✅ Create `users` table schema (email, password_hash, role, timestamps) — `src/db/schema.ts`
- ✅ Add auth dependencies (`bcrypt`, `jsonwebtoken`, and TypeScript typings)
- ✅ Create `POST /auth/register` route — `src/index.ts`
- ✅ Implement register logic with bcrypt password hashing
- ✅ Add validation for required fields (email, password) — `src/utils/response.ts:validateCredentials`
- ✅ Define auth request/response types — `src/types/api.ts`
- ⬜ Email format and password strength validation (currently only checks presence)
- ⬜ Unit tests for password hashing behavior
- ⬜ Integration tests for register endpoint

#### Notes on Implementation

- Register route and login route live in `src/index.ts` (not yet extracted to `src/routes/auth.ts`)
- Auth utilities (`error`, `validateCredentials`, `generateToken`, `authSuccess`) are in `src/utils/response.ts`
- Response shape is `{ status: "success", data: { token, user } }` — differs slightly from the planned error shape (see API Contracts below)
- Duplicate email constraint is enforced at the DB level (throws on insert); not yet caught and returned as a friendly 409 error

---

### Sub-Phase 3.2: User Login (`/auth/login`) ✅

**Dependencies:** Sub-Phase 3.1 complete (users table), JWT configuration
**Goal:** Authenticate users and issue stateless JWT access tokens

#### Tasks

- ✅ JWT configuration via env vars (`JWT_SECRET`, `JWT_EXPIRES_IN`) — `src/config/env.ts`
- ✅ JWT token generation — `src/utils/response.ts:generateToken`
- ✅ Implement login logic (validate credentials, compare bcrypt hash)
- ✅ Create `POST /auth/login` route — `src/index.ts`
- ⬜ Unit tests for token creation/verification
- ⬜ Integration tests for login flow

#### Notes on Implementation

- Invalid credentials return consistent `"Invalid email or password"` message (no user enumeration)
- Token payload: `{ userId, email }`; expiry from `JWT_EXPIRES_IN` env var

---

### Sub-Phase 3.3: Middleware & Protection ⬜

**Dependencies:** Sub-Phase 3.2 complete (JWT token generation)
**Goal:** Protect routes with JWT authentication

#### Tasks

- ⬜ Create `authenticate` middleware (`src/middleware/auth.ts`) — validate bearer tokens, attach user claims to `ctx.state`
- ⬜ Wire auth middleware to protected routes (`/translate`, `/memory`)
- ⬜ Unit tests for middleware behavior
- ⬜ Integration tests for protected routes

#### Success Criteria

- Authenticate middleware validates bearer tokens via JWT signature and attaches user claims
- Protected routes return 401 without valid token
- Core unit and integration tests pass for all auth flows
- No server-side token storage or revocation required

---

### Sub-Phase 3.4: Refactor & Tests ⬜

**Goal:** Clean up implementation and add test coverage

#### Tasks

- ⬜ Extract auth routes from `src/index.ts` into `src/routes/auth.ts`
- ⬜ Handle duplicate email DB error and return friendly 409 response
- ⬜ Set `ctx.status = 201` on successful register
- ⬜ Add test suite (`tests/auth.test.ts`) covering unit and integration scenarios

---

## Deliverables

### Data Model

- `users` table supports:
  - unique email,
  - bcrypt `password_hash`,
  - role (`user` default, `admin` allowed),
  - timestamps.
- **Single token design** - one long-lived stateless JWT; no refresh token table needed

### Service Layer (currently in `src/index.ts` route handlers)

- `register`: create user with hashed password, issue single long-lived JWT. ✅
- `login`: validate credentials and issue single long-lived JWT. ✅

### Middleware

- `authenticate`: validate bearer access token and attach user claims to request context. ⬜ (`src/middleware/auth.ts`)

### Routes

- `POST /auth/register` ✅
- `POST /auth/login` ✅

## Security Requirements

- ✅ Hash passwords with bcrypt before storage.
- ✅ Use reasonably long-lived JWT tokens (7-30 days) for stateless authentication.
- ✅ Never expose `password_hash` in API responses.
- ✅ Use consistent invalid-credential responses to reduce user enumeration risk.
- ⬜ Avoid logging plaintext passwords or raw tokens (no logging in place yet).
- ⬜ Implement secure token storage guidelines for clients (httpOnly cookies or secure storage).

## API Contracts

### `POST /auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Success (`201` — *currently returns 200, needs fix*):

```json
{
  "status": "success",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
}
```

### `POST /auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Success (`200`): same response shape as register.

### Error Shape

```json
{
  "status": "error",
  "message": "Invalid email or password",
  "code": 401
}
```

> **Note:** The original plan specified `{ "error": { "code": "...", "message": "..." } }` but the implementation uses `{ status, message, code }` — the implemented shape is used going forward.

## Test Plan

### Unit Tests

- Password hashing and verification behavior.
- JWT token creation, signing, and verification.
- Duplicate email rejection on register.
- Invalid credential rejection on login.
- JWT expiry validation (expired tokens rejected).

### Integration Tests

- `POST /auth/register` success and validation failures.
- `POST /auth/login` success and wrong password handling.
- Protected route behavior:
  - 401 without token,
  - 401 with invalid token,
  - 401 with expired token,
  - success with valid token.

## Acceptance Criteria

- ✅ Auth routes are implemented and wired.
- ✅ Passwords are never stored in plaintext.
- ✅ Single long-lived stateless JWT token flow works end-to-end.
- ⬜ `authenticate` middleware validates JWT signatures and protects `/translate` and `/memory` routes.
- ⬜ Core unit and integration tests pass for happy and failure paths.
- ✅ `PLAN.md` points to this detailed auth phase plan.
