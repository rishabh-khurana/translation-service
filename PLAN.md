# Translation Service - Project Plan

## Overview

A self-hosted i18n translation service with Translation Memory (TM), fuzzy matching, glossary enforcement, LibreTranslate as the external translation provider, and JWT-based authentication.

---

## Tech Stack

| Component | Tool |
|-----------|------|
| Framework | Koa + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Cache | Redis |
| Translation API | LibreTranslate |
| Docker | Docker Compose |

---

## File Structure

```
translations-app/
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── auth.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── translate.ts
│   │   ├── glossary.ts
│   │   └── memory.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── translate.service.ts
│   │   ├── memory.service.ts
│   │   ├── glossary.service.ts
│   │   └── libretranslate.service.ts
│   └── types/
│       └── index.ts
└── tests/
```

---

## Docker Compose Services

| Service | Port | Purpose |
|---------|------|---------|
| app | 3000 | Koa API |
| postgres | 5432 | Translation memory DB |
| redis | 6379 | Caching |
| libretranslate | 5000 | NMT translation API |

---

## Core Features

### Authentication
- JWT-based authentication with access + refresh tokens
- Password hashing with bcrypt
- Token validation middleware for protected routes
- Role-based access (admin, user)
- Secure password storage

### Translation Memory (TM)
- Store all translations with source text, target text, language pair
- Fuzzy matching using Levenshtein distance
- Configurable match threshold (e.g., 80% similarity)
- Auto-suggest from memory before calling external API

### Glossary
- Define term mappings per language pair
- Force glossary terms in translations
- Pre/post-processing on translations

### Fuzzy Matching
- Levenshtein distance algorithm
- Configurable similarity threshold
- Return match percentage with suggestions

### Caching
- Redis cache for frequent translations
- Cache key: hash(source_text + target_lang + glossary_version)
- TTL-based expiration

### External Translation (LibreTranslate)
- Neural machine translation when no TM match found
- Retry logic with exponential backoff
- Falls back to local TM before calling external API

---

## API Endpoints

```
POST   /auth/register          # Register new user
POST   /auth/login             # Login, returns JWT
POST   /auth/refresh            # Refresh JWT token

POST   /translate              # Translate text (uses TM first, then fallback)
GET    /translate/languages    # Get supported languages

GET    /memory                 # List TM entries
POST   /memory                 # Add translation to memory
DELETE /memory/:id             # Delete TM entry

GET    /glossary               # List glossary terms
POST   /glossary               # Add glossary term
PUT    /glossary/:id           # Update glossary term
DELETE /glossary/:id           # Delete glossary term

GET    /health                 # Health check
```

---

## Database Schema

### Translation Memory Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| source_text | TEXT | NOT NULL |
| target_text | TEXT | NOT NULL |
| source_lang | VARCHAR(10) | NOT NULL |
| target_lang | VARCHAR(10) | NOT NULL |
| usage_count | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

**Indexes:** (source_lang, target_lang), source_text (trigram)

### Glossary Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| source_term | TEXT | NOT NULL |
| target_term | TEXT | NOT NULL |
| source_lang | VARCHAR(10) | NOT NULL |
| target_lang | VARCHAR(10) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

**Indexes:** (source_lang, target_lang)

### Users Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | DEFAULT 'user' |
| created_at | TIMESTAMP | DEFAULT NOW() |

### Supported Languages Table
| Column | Type | Constraints |
|--------|------|-------------|
| code | VARCHAR(10) | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |

---

## Implementation Order

### Phase 1: Foundation
- Drizzle schema + migrations
- Basic Koa app with error handling

### Phase 1.5: Authentication
- User schema + migrations
- Auth service with bcrypt + JWT
- Register/login/refresh endpoints
- Auth middleware for protected routes

### Phase 2: Docker & Infrastructure
- Docker Compose (PostgreSQL + Redis + LibreTranslate + app)
- Environment configuration for containerized setup

### Phase 3: Translation Memory
- CRUD for TM entries
- Fuzzy matching algorithm
- Memory lookup before external calls

### Phase 4: Glossary
- CRUD for glossary terms
- Pre-processing: replace known terms before translation
- Post-processing: enforce glossary in output

### Phase 5: Translation Flow
- Translation flow: Local TM → Smartling NMT → Cache & Return
- Glossary pre/post-processing at each step
- Response format with match confidence
- Store Smartling results in local TM

### Phase 6: Caching & Polish
- Redis caching layer
- Rate limiting
- Health checks

---

## Environment Variables

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/translations
REDIS_URL=redis://localhost:6379
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=optional
PORT=3000
NODE_ENV=development
FUZZY_THRESHOLD=0.8
CACHE_TTL=86400
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

---

## Concepts Covered

| Concept | Implementation |
|---------|----------------|
| Authentication | JWT tokens with refresh flow |
| Translation Memory | Database storage + fuzzy matching |
| Fuzzy Matching | Levenshtein distance algorithm |
| Glossary | Term replacement pipeline |
| External API Integration | LibreTranslate NMT with retry |
| Redis Caching | Translation cache |
| Rate Limiting | Sliding window |
| Middleware Patterns | Error handling, logging |
