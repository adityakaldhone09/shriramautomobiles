import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {
    // Ignore if already loaded or syntax edge cases
  }
}

const envSchema = z.object({
  PORT: z.string().default('5001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AUTH_SECRET: z.string().default('shriram-automobiles-secret-key-2026'),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

function checkEnv() {
  console.log('Checking environment variables...');
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('\x1b[31m[ERROR] Environment validation failed:\x1b[0m', result.error.format());
    process.exit(1);
  }
  console.log('\x1b[32m[OK] Environment variables verified successfully.\x1b[0m');
  if (!process.env.DATABASE_URL) {
    console.log('\x1b[33m[NOTE] DATABASE_URL not provided. In-memory database (pg-mem) fallback will be used.\x1b[0m');
  }
}

checkEnv();
