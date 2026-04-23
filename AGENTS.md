# Agent Guidelines for Translations App

This is a Koa + TypeScript translation service with PostgreSQL (Drizzle ORM), Redis caching, and Smartling NMT integration.

---

## Build Commands

```bash
yarn install            # Install dependencies
yarn dev                # create-env + docker compose up (full local stack)
yarn build              # Compile TypeScript to dist/
yarn start              # Run production build
yarn db:push            # Push schema changes to database (no migration files)
yarn db:studio          # Open Drizzle Studio (database GUI)
```

## Testing

```bash
yarn test               # Run all tests
npx vitest run path/to/test.ts  # Run specific test with vitest
```

Add test scripts to package.json as needed (vitest or jest recommended).

---

## Code Style Guidelines

### TypeScript
- Use explicit return types for exported functions
- Avoid `any`; use `unknown` when type is truly unknown
- Use interfaces for object shapes, types for unions/aliases
- Enable strict mode in tsconfig.json

### Naming
- **Files**: kebab-case (e.g., `auth-middleware.ts`)
- **Classes/PascalCase**: `TranslationService`, `UserModel`
- **Functions/variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: Prefix with `I` optional (e.g., `TranslationResult` not `ITranslationResult`)

### Imports
- Use absolute imports from `src/` (configure paths in tsconfig)
- Order: external libs → internal modules → relative
- Example:
```typescript
import { Context, Next } from 'koa';
import { authenticate } from '@/middleware/auth';
import { TranslationService } from '@/services/translate.service';
```

### Formatting
- Use Prettier with 2-space indentation
- Trailing commas in multiline objects/arrays
- Semicolons required
- Max line length: 100

### Error Handling
- Use custom error classes extending `Error`
- Koa error middleware catches and returns proper HTTP responses
- Never expose stack traces in production
- Log errors with appropriate level (warn/error)

### Database (Drizzle)
- Define schema in `src/db/schema.ts`
- Use `db:push` for schema changes (no migration files)
- Prefer explicit column types over inferred
- Add indexes for frequently queried columns

### Configuration
- All config via environment variables in `src/config/env.ts`
- Use `dotenv` for local development
- Validate required vars at startup

---

## Project Structure

```
src/
├── index.ts           # Entry point
├── app.ts             # Koa app setup
├── config/env.ts      # Environment config
├── db/
│   ├── index.ts       # DB connection
│   └── schema.ts      # Drizzle schema
├── middleware/        # Koa middleware (auth, error, rate-limit)
├── routes/            # Route handlers
├── services/          # Business logic
│   ├── auth.service.ts
│   ├── translate.service.ts
│   ├── memory.service.ts
│   ├── smartling.service.ts
│   └── glossary.service.ts (optional)
└── types/             # Shared TypeScript types
```

---

## Key Patterns

### JWT Auth
- Single long-lived JWT token (stateless)
- Passwords hashed with bcrypt
- Middleware validates Bearer token on protected routes

### Translation Flow
1. Check Redis cache
2. Query Translation Memory (fuzzy match)
3. Call Smartling NMT if no TM match
4. Store result in TM and cache
5. Apply glossary pre/post-processing

### Fuzzy Matching
- Levenshtein distance algorithm
- Configurable threshold (default 80%)
- Return match percentage with suggestions

---

## Environment Variables Required

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/translations
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
FUZZY_THRESHOLD=0.8
CACHE_TTL=86400
SMARTLING_API_URL=https://api.smartling.com
SMARTLING_USER_IDENTIFIER=<id>
SMARTLING_USER_SECRET=<secret>
SMARTLING_PROJECT_ID=<id>
```

---

## Notes

- Start implementation following PLAN.md phases
- Use direct PostgreSQL/Redis install (Homebrew) OR Docker Compose for local dev
- All new code must be TypeScript with strict typing
- Write unit tests alongside features
- Use `db:push` for schema changes instead of migrations
