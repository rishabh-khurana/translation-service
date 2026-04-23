const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV === 'production') {
  console.log('Production mode - expecting .env to be provided');
  return;
}

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  return;
}

const template = `NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
FUZZY_THRESHOLD=0.8
CACHE_TTL=86400
REDIS_URL=redis://localhost:6379
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=translations
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/translations
`;

fs.writeFileSync(envPath, template);
console.log('.env created for local development');
