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
- Role-aware authorization guard (`admin`, `user`).
- Auth-focused testing across service and route layers.

### Out of Scope

- OAuth/SSO providers.
- Password reset/email verification flows.
- API key-based authentication.

## Implementation Sub-Phases

### Sub-Phase 3.1: User Registration (`/auth/register`)

**Dependencies:** Database setup complete
**Goal:** Allow users to create accounts with secure password hashing

#### Tasks

- Create `users` table schema (email, password_hash, role, timestamps)
- Add auth dependencies (`bcrypt`, `jsonwebtoken`, and TypeScript typings)
- Create `POST /auth/register` route
- Implement `register` service function
- Set up bcrypt for password hashing
- Add validation for email uniqueness and password strength
- Write unit tests for password hashing behavior
- Write integration tests for register endpoint

#### Success Criteria

- Users can register with email and password
- Passwords are hashed with bcrypt before storage
- Duplicate emails are rejected with appropriate error
- Response includes user object (no password_hash) and tokens

---

### Sub-Phase 3.2: User Login (`/auth/login`)

**Dependencies:** Sub-Phase 3.1 complete (users table), JWT configuration
**Goal:** Authenticate users and issue stateless JWT access/refresh tokens

#### Tasks

- Set up JWT configuration (env var for token expiry/secret)
- Set up JWT token generation (single long-lived token with signed payload)
- Implement `login` service function (validate credentials)
- Create `POST /auth/login` route
- Write unit tests for token creation/verification
- Write integration tests for login flow

#### Success Criteria

- Users can login with valid credentials
- Invalid credentials return consistent error messages
- Single long-lived JWT token issued on successful login
- Expired/invalid tokens are rejected via JWT validation

---

### Sub-Phase 3.3: Middleware & Protection

**Dependencies:** Sub-Phase 3.2 complete (JWT token generation)
**Goal:** Protect routes with JWT authentication

#### Tasks

- Create `authenticate` middleware (validate tokens via JWT signature)
- Create `requireRole` middleware (admin/user role guards)
- Write tests for middleware behavior
- Write integration tests for protected routes and role-based access

#### Success Criteria

- Authenticate middleware validates bearer tokens via JWT signature and attaches user claims
- Protected routes return 401 without valid token
- Role guard returns 403 when user role is insufficient
- Core unit and integration tests pass for all auth flows
- No server-side token storage or revocation required

---

## Deliverables

### Data Model

- `users` table supports:
  - unique email,
  - bcrypt `password_hash`,
  - role (`user` default, `admin` allowed),
  - timestamps.
- **Single token design** - one long-lived stateless JWT; no refresh token table needed

### Service Layer

- `register`: create user with hashed password, issue single long-lived JWT.
- `login`: validate credentials and issue single long-lived JWT.

### Middleware

- `authenticate`: validate bearer access token and attach user claims to request context.
- `requireRole`: enforce role-based access for admin-only endpoints.

### Routes

- `POST /auth/register`
- `POST /auth/login`

## Security Requirements

- Hash passwords with bcrypt before storage.
- Use reasonably long-lived JWT tokens (7-30 days) for stateless authentication.
- Never expose `password_hash` or sensitive token internals in API responses.
- Avoid logging plaintext passwords or raw tokens.
- Use consistent invalid-credential responses to reduce user enumeration risk.
- Implement secure token storage guidelines for clients (httpOnly cookies or secure storage).
- Token expiry enforced via JWT `exp` claim - no server-side revocation needed.

## API Contracts

### `POST /auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Success (`201`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "<jwt>"
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
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

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
- Role guard behavior:
  - 403 when role is insufficient.

## Acceptance Criteria

- Auth routes are implemented and wired.
- Passwords are never stored in plaintext.
- Single long-lived stateless JWT token flow works end-to-end.
- Auth middleware correctly validates JWT signatures and protects secured routes.
- Core unit and integration tests pass for happy and failure paths.
- `PLAN.md` points to this detailed auth phase plan.

