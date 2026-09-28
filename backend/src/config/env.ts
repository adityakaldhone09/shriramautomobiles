import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const possibleEnvPaths = [
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '..', 'backend', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), 'backend', '.env.local'),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore invalid or already-loaded env files.
    }
  }
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5001'),
    DATABASE_URL: z.string().optional(),
    AUTH_SECRET: z.string().default('shriram-automobiles-secret-key-2026'),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_STORAGE_BUCKET: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),
    APP_URL: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return (
          data.AUTH_SECRET &&
          data.AUTH_SECRET !== 'shriram-automobiles-secret-key-2026' &&
          data.AUTH_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message:
        'In production, AUTH_SECRET must be set to a strong random secret of at least 32 characters and cannot use the default placeholder',
      path: ['AUTH_SECRET'],
    }
  );

export const env = envSchema.parse(process.env);

