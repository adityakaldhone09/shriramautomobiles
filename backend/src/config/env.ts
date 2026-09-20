import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001'),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().default('shriram-automobiles-secret-key-2026'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
