import { env } from './env';

export const storageConfig = {
  supabaseUrl: env.SUPABASE_URL,
  bucket: env.SUPABASE_STORAGE_BUCKET || 'shriram-assets',
};
