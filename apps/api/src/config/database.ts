import { env } from './env';

export const databaseConfig = {
  url: env.DATABASE_URL,
  isInMemory: !env.DATABASE_URL || env.DATABASE_URL.includes('dummy'),
};
