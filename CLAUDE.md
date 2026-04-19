# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev              # create-env + docker compose up (full local stack)
yarn build            # Compile TypeScript to dist/
yarn start            # Run compiled production build

yarn db:push          # Push Drizzle schema to the database
yarn db:studio        # Open Drizzle Studio GUI

yarn test             # Run all tests
npx vitest run path/to/test.ts  # Run a single test file
```

## Architecture

Self-hosted i18n translation service built with Koa + TypeScript. Entry point is `src/index.ts` (starts server); `src/app.ts` handles Koa setup and middleware registration.

Planned structure per PLAN.md:

```
src/
├── config/env.ts                 # Env var validation at startup
├── db/
│   ├── index.ts                  # Drizzle + pg connection
│   ├── schema.ts                 # Table definitions
│   └── migrations/               # Drizzle-generated SQL
├── middleware/                   # errorHandler, rateLimiter, auth (JWT)
├── routes/                       # auth, translate, glossary, memory
├── services/
│   ├── auth.service.ts           # bcrypt + JWT access/refresh tokens
│   ├── translate.service.ts      # Orchestrates full translation pipeline
│   ├── memory.service.ts         # Translation Memory CRUD + fuzzy match
│   ├── glossary.service.ts       # Term pre/post-processing
│   └── libretranslate.service.ts # External NMT API with retry logic
└── types/index.ts
```

### Translation Pipeline (`POST /translate`)

1. Check Redis cache (key: hash of `source_text + target_lang + glossary_version`)
2. Apply glossary pre-processing (replace known terms)
3. Query Translation Memory — fuzzy match via Levenshtein (threshold: `FUZZY_THRESHOLD`, default 80%)
4. If no TM match, call LibreTranslate NMT
5. Apply glossary post-processing
6. Store result in TM + Redis cache
7. Return translation with match confidence score

### Auth

Single long-lived stateless JWT token. `src/middleware/auth.ts` validates `Bearer` tokens. Passwords hashed with bcrypt. Roles: `admin`, `user`.

### Database (Drizzle + PostgreSQL)

Schema in `src/db/schema.ts`. Push schema changes with `yarn db:push`. Key tables: `translation_memory` (trigram index on `source_text`), `glossary`, `users`, `supported_languages`.

## Implementation Phases

See PLAN.md. Order: Foundation → Auth → Docker → Translation Memory → Glossary → Translation Flow → Caching & Polish.

## Environment Variables

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/translations
REDIS_URL=redis://localhost:6379
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=   # optional
PORT=3000
NODE_ENV=development
JWT_SECRET=
JWT_EXPIRES_IN=7d
FUZZY_THRESHOLD=0.8
CACHE_TTL=86400
```

## Code Style

- Files: kebab-case; classes: PascalCase; functions/variables: camelCase; constants: UPPER_SNAKE_CASE
- Explicit return types on exported functions; no `any` — use `unknown`
- Import order: external libs → internal modules → relative
- Prettier: 2-space indent, trailing commas, semicolons, 100-char line limit
- Custom error classes extending `Error`; never expose stack traces in production
