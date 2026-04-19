import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`Warning: Missing required env vars: ${missing.join(', ')}`);
}

export const env = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/translations',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  libreTranslateUrl: process.env.LIBRETRANSLATE_URL || 'http://localhost:5000',
  libreTranslateApiKey: process.env.LIBRETRANSLATE_API_KEY,
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  fuzzyThreshold: parseFloat(process.env.FUZZY_THRESHOLD || '0.8'),
  cacheTtl: parseInt(process.env.CACHE_TTL || '86400', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};
