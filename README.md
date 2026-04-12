# translations-service

A self-hosted i18n translation service with Translation Memory (TM), fuzzy matching, LibreTranslate integration, and JWT-based authentication.

## Tech Stack

| Component | Tool |
|-----------|------|
| Framework | Koa + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Cache | Redis |
| Translation API | LibreTranslate |
| Docker | Docker Compose |

## Getting Started

```bash
yarn dev
```

Generates `.env` if missing, then starts the app and Postgres via Docker Compose.

To run only the TypeScript dev server on the host (e.g. Postgres already running), use `yarn exec nodemon src/index.ts`.

## Current Status

### Phase 1: Foundation ✓
- Project setup with TypeScript and strict mode
- Drizzle ORM schema with 3 tables (users, translation_memory, supported_languages)
- Environment configuration with validation
- Basic Koa app with error handling middleware
- Health check endpoint

## Project Structure

```
src/
├── index.ts           # Entry point
├── app.ts             # Koa app setup
├── config/env.ts      # Environment config
├── db/
│   ├── index.ts       # DB connection
│   └── schema.ts     # Drizzle schema
└── middleware/
    └── errorHandler.ts
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Create `.env` if needed, then start all services via Docker Compose |
| `yarn build` | Compile TypeScript |
| `yarn start` | Run production build |
| `yarn db:push` | Push Drizzle schema to the database |
| `yarn db:studio` | Open Drizzle Studio |
| `yarn test` | Run tests |
