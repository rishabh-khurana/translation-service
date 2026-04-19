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

- **Token Revocation**: Requires token blacklisting or short expiry times (handled via refresh token rotation)
- **Token Size**: Slightly larger request headers (mitigated by minimal JWT payload)
- **No Instant Logout**: Cannot immediately invalidate all user sessions server-side (addressed with token expiry strategy)

## Goal and Scope

### In Scope

- User registration and login with hashed passwords.
- Access and refresh token issuance (stateless JWTs).
- Token expiry-based session management (no server-side storage).
- Auth middleware for protected endpoints.
- Role-aware authorization guard (`admin`, `user`).
- Auth-focused testing across service and route layers.
- Client-side logout (token deletion).

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

- Set up JWT configuration (env vars for access + refresh token expiry/secret)
- Set up JWT token generation (access + refresh tokens with signed payloads)
- Implement `login` service function (validate credentials)
- Create `POST /auth/login` route
- Implement `refresh` service function for token rotation (stateless - no DB storage)
- Create `POST /auth/refresh` route
- Write unit tests for token creation/verification and rotation
- Write integration tests for login and refresh flows

#### Success Criteria

- Users can login with valid credentials
- Invalid credentials return consistent error messages
- Access and refresh tokens are issued on successful login (stateless JWTs)
- Refresh token rotation issues new token pair (old tokens naturally expire)
- Expired/invalid refresh tokens are rejected via JWT validation

---

### Sub-Phase 3.3: Logout & Middleware (`/auth/logout`)

**Dependencies:** Sub-Phase 3.2 complete (JWT token generation)
**Goal:** Enable client-side session termination and protect routes with authentication

#### Tasks

- Implement `logout` endpoint (client-side token deletion acknowledgment)
- Create `POST /auth/logout` route
- Create `authenticate` middleware (validate access tokens via JWT signature)
- Create `requireRole` middleware (admin/user role guards)
- Write tests for logout and middleware behavior
- Write integration tests for protected routes and role-based access

#### Success Criteria

- Logout endpoint acknowledges session termination (client deletes tokens)
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
- **No refresh token table** - tokens are stateless JWTs with embedded expiry claims

### Service Layer

- `register`: create user with hashed password, issue initial token pair.
- `login`: validate credentials and issue stateless JWT token pair.
- `refresh`: validate refresh token signature/expiry, issue new token pair (stateless rotation).
- `logout`: acknowledge logout (client responsible for token deletion).

### Middleware

- `authenticate`: validate bearer access token and attach user claims to request context.
- `requireRole`: enforce role-based access for admin-only endpoints.

### Routes

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout` (recommended for explicit token revocation)

## Security Requirements

- Hash passwords with bcrypt before storage.
- Use short-lived access tokens (15-30 minutes) and longer-lived refresh tokens (7-30 days).
- Rotate refresh tokens on each successful refresh (stateless - old tokens naturally expire).
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
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
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

### `POST /auth/refresh`

Request:

```json
{
  "refreshToken": "<jwt>"
}
```

Success (`200`):

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

### `POST /auth/logout`

Request:

```json
{
  "refreshToken": "<jwt>"
}
```

Success (`200`):

```json
{
  "success": true
}
```

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
- Access/refresh token creation, signing, and verification.
- Duplicate email rejection on register.
- Invalid credential rejection on login.
- Refresh token rotation issues new valid token pair.
- JWT expiry validation (expired tokens rejected).

### Integration Tests

- `POST /auth/register` success and validation failures.
- `POST /auth/login` success and wrong password handling.
- `POST /auth/refresh` success and expired token rejection.
- Protected route behavior:
  - 401 without token,
  - 401 with invalid token,
  - 401 with expired token,
  - success with valid token.
- Role guard behavior:
  - 403 when role is insufficient.
- Logout endpoint acknowledges session termination.

## Acceptance Criteria

- Auth routes are implemented and wired.
- Passwords are never stored in plaintext.
- Stateless access/refresh token flow works end-to-end.
- Refresh token rotation issues new token pair on each refresh.
- Auth middleware correctly validates JWT signatures and protects secured routes.
- Core unit and integration tests pass for happy and failure paths.
- `PLAN.md` points to this detailed auth phase plan.

