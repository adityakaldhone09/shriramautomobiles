import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const possibleEnvPaths = [
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '..', 'backend', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore
    }
  }
}

const rawUrl = process.env.DATABASE_URL || '';
if (!rawUrl || rawUrl.includes('dummy') || rawUrl.includes('[YOUR-PASSWORD]')) {
  console.log('No valid DATABASE_URL provided. Skipping remote RLS configuration.');
  process.exit(0);
}

const pool = new Pool({
  connectionString: rawUrl,
  connectionTimeoutMillis: 5000,
  ssl: /supabase|pooler/i.test(rawUrl) ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

const publicCatalogTables = [
  'brands',
  'vehicle_models',
  'part_categories',
  'services',
  'service_symptoms',
  'symptom_service_mapping',
  'symptom_part_mapping',
  'vehicle_part_compatibility',
  'available_slots',
  'helmet_brands',
  'helmet_types',
  'helmet_products',
  'helmet_variants',
  'helmet_sizes',
];

async function secureDatabase() {
  console.log('🔒 Auditing and securing public tables with Row Level Security (RLS)...');
  const res = await pool.query(
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
  );
  const tables = res.rows;

  let enabledCount = 0;
  for (const { tablename, rowsecurity } of tables) {
    try {
      if (!rowsecurity) {
        await pool.query(`ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY;`);
        enabledCount++;
      }

      await pool.query(
        `DROP POLICY IF EXISTS "service_role_all_${tablename}" ON public."${tablename}";`
      );
      await pool.query(
        `CREATE POLICY "service_role_all_${tablename}" ON public."${tablename}" FOR ALL TO service_role USING (true) WITH CHECK (true);`
      );

      if (publicCatalogTables.includes(tablename)) {
        await pool.query(
          `DROP POLICY IF EXISTS "public_read_${tablename}" ON public."${tablename}";`
        );
        await pool.query(
          `CREATE POLICY "public_read_${tablename}" ON public."${tablename}" FOR SELECT TO anon, authenticated USING (true);`
        );
      }
    } catch (err: any) {
      console.warn(`Warning securing table ${tablename}:`, err.message);
    }
  }

  // Create auto-enable event trigger for future table creations
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.pgrst_auto_enable_rls()
      RETURNS event_trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
      DECLARE
          obj record;
      BEGIN
          FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'
          LOOP
              IF obj.schema_name = 'public' THEN
                  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', obj.object_identity);
              END IF;
          END LOOP;
      END;
      $$;
    `);

    await pool.query(`
      DROP EVENT TRIGGER IF EXISTS auto_enable_rls_trigger;
      CREATE EVENT TRIGGER auto_enable_rls_trigger
      ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE')
      EXECUTE FUNCTION public.pgrst_auto_enable_rls();
    `);
    console.log('✅ Auto-enable RLS event trigger configured for future tables.');
  } catch (err: any) {
    console.warn('Warning creating event trigger:', err.message);
  }

  const verify = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"
  );
  if (verify.rows.length === 0) {
    console.log(`✅ All ${tables.length} tables in public schema are protected by Row Level Security.`);
  } else {
    console.warn(`⚠️ Warning: ${verify.rows.length} tables still have RLS disabled:`, verify.rows.map((r: any) => r.tablename));
  }
}

secureDatabase()
  .catch((err) => {
    console.error('RLS security execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
