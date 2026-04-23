# Translation Service - Project Plan

## Overview

A self-hosted i18n translation service with Translation Memory (TM), fuzzy matching, Smartling NMT integration (or LibreTranslate for local dev), and JWT-based authentication.

---

## Tech Stack


| Component       | Tool                                                    |
| --------------- | ------------------------------------------------------- |
| Framework       | Koa + TypeScript                                        |
| Database        | PostgreSQL + Drizzle ORM                                |
| Cache           | Redis                                                   |
| Translation API | Smartling NMT (production) / LibreTranslate (local dev) |
| Docker          | Docker Compose                                          |


---

## File Structure

```
translations-service/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── docker-compose.yml
├── src/
│   ├── index.ts           # Entry point
│   ├── app.ts              # Koa app setup
│   ├── config/
│   │   └── env.ts          # Environment config
│   ├── db/
│   │   ├── index.ts        # DB connection
│   │   └── schema.ts       # Drizzle schema
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── auth.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── translate.ts
│   │   └── memory.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── translate.service.ts
│   │   ├── memory.service.ts
│   │   ├── smartling.service.ts
│   │   └── glossary.service.ts (optional)
│   └── types/
│       └── index.ts
└── tests/
```

---

## Docker Compose Services

Containerized development environment with all required services.


| Service        | Port | Purpose                              |
| -------------- | ---- | ------------------------------------ |
| postgres       | 5432 | Translation memory DB                |
| redis          | 6379 | Caching                              |
| libretranslate | 5000 | Local NMT translation API (optional) |


**Note:** All services run via Docker Compose.

---

## Core Features

### Authentication

- JWT-based authentication with single long-lived token
- Password hashing with bcrypt
- Token validation middleware for protected routes
- Role-based access (admin, user)
- Secure password storage

### Translation Memory (TM)

- Store all translations with source text, target text, language pair
- Fuzzy matching using Levenshtein distance
- Configurable match threshold (e.g., 80% similarity)
- Auto-suggest from memory before calling external API

### Fuzzy Matching

- Levenshtein distance algorithm
- Configurable similarity threshold
- Return match percentage with suggestions

### Caching

- Redis cache for frequent translations
- Cache key: hash(source_text + target_lang)
- TTL-based expiration

### External Translation (Smartling/LibreTranslate)

- Smartling NMT for production environments
- LibreTranslate for local development
- Neural machine translation when no TM match found
- Retry logic with exponential backoff
- Falls back to local TM before calling external API

### Glossary (Optional Enhancement)

- Apply glossary pre/post-processing
- Domain-specific terminology overrides
- Term consistency enforcement

---

## API Endpoints

```
POST   /auth/register          # Register new user
POST   /auth/login             # Login, returns JWT

POST   /translate              # Translate text (uses TM first, then fallback)
GET    /translate/languages   # Get supported languages

GET    /memory                 # List TM entries
POST   /memory                 # Add translation to memory
DELETE /memory/:id             # Delete TM entry

GET    /health                 # Health check
```

---

## Database Schema

### Users Table


| Column        | Type         | Constraints      |
| ------------- | ------------ | ---------------- |
| id            | SERIAL       | PRIMARY KEY      |
| email         | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL         |
| role          | VARCHAR(20)  | DEFAULT 'user'   |
| created_at    | TIMESTAMP    | DEFAULT NOW()    |


### Translation Memory Table


| Column      | Type        | Constraints   |
| ----------- | ----------- | ------------- |
| id          | SERIAL      | PRIMARY KEY   |
| source_text | TEXT        | NOT NULL      |
| target_text | TEXT        | NOT NULL      |
| source_lang | VARCHAR(10) | NOT NULL      |
| target_lang | VARCHAR(10) | NOT NULL      |
| usage_count | INTEGER     | DEFAULT 0     |
| created_at  | TIMESTAMP   | DEFAULT NOW() |
| updated_at  | TIMESTAMP   | DEFAULT NOW() |


**Indexes:** (source_lang, target_lang), source_text (trigram)

### Supported Languages Table (Optional)


| Column | Type         | Constraints |
| ------ | ------------ | ----------- |
| code   | VARCHAR(10)  | PRIMARY KEY |
| name   | VARCHAR(100) | NOT NULL    |


---

## Implementation Order

### Phase 1: Foundation ✅

- Basic Koa app with error handling
- Health check endpoint
- Environment configuration
- Drizzle schema setup (users, translationMemory)
- Drizzle `db:push` to create tables

### Phase 2: Docker Setup ✅

- Create `docker-compose.yml` for PostgreSQL + Redis + LibreTranslate
- Run `docker-compose up -d` to start all services
- Verify PostgreSQL is accessible on port 5432
- Verify Redis is accessible on port 6379
- Configure environment variables for Docker services

### Phase 3: Authentication ✅

- Authentication phase details moved to: `plans/phase-3-auth.md`

### Phase 4: Translation Memory

- CRUD endpoints for TM entries
- Fuzzy matching algorithm (Levenshtein distance)
- Memory lookup before external calls
- Configurable match threshold
- TM routes (`/memory`, `GET /memory/:id`, `POST /memory`, `DELETE /memory/:id`)

### Phase 5: Translation Flow

- Integration with Smartling NMT API (production)
- OR LibreTranslate API (local dev)
- Translation flow: Local TM → NMT → Cache & Return
- Response format with match confidence
- Store results in local TM
- Translation routes (`/translate`, `GET /translate/languages`)

### Phase 6: Caching & Performance

- Redis caching layer for translations
- Rate limiting middleware
- Performance optimizations
- Health check enhancements
- Production readiness

### Future Enhancements

- Glossary management and pre/post-processing
- Rate limiting per user/api key
- Admin dashboard
- Batch translation support
- Webhook notifications

---

## Environment Variables

```bash
# Core
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/translations
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development

# Auth
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Fuzzy Matching
FUZZY_THRESHOLD=0.8

# Caching
CACHE_TTL=86400

# Translation API (Production)
SMARTLING_API_URL=https://api.smartling.com
SMARTLING_USER_IDENTIFIER=<your-id>
SMARTLING_USER_SECRET=<your-secret>
SMARTLING_PROJECT_ID=<your-project-id>

# Translation API (Local Dev)
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=optional
```

---

## Concepts Covered


| Concept                  | Implementation                                  |
| ------------------------ | ----------------------------------------------- |
| Database Schema          | Drizzle ORM with `db:push` (no migration files) |
| Authentication           | Single long-lived JWT token (stateless)         |
| Translation Memory       | Database storage + fuzzy matching               |
| Fuzzy Matching           | Levenshtein distance algorithm                  |
| External API Integration | Smartling NMT (prod) / LibreTranslate (dev)     |
| Redis Caching            | Translation cache                               |
| Rate Limiting            | Sliding window                                  |
| Middleware Patterns      | Error handling, logging                         |


---

## Local Development Setup

### Docker Compose (Required)

All services run via Docker Compose:

```bash
# Start all services
docker-compose up -d

# Verify PostgreSQL is running
docker-compose exec postgres pg_isready

# Verify Redis is running
docker-compose exec redis redis-cli ping

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## Notes

- All new code must be TypeScript with strict typing
- Write unit tests alongside features
- Use `drizzle-kit push` instead of migrations for simplicity
- Docker Compose manages all development dependencies

