-- ==============================================================================
-- Migration: 0001_enable_rls_security_policies.sql
-- Remediates Supabase Linter Rule 0013: rls_disabled_in_public
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all public tables dynamically
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;

-- 2. Define Service Role Full Access Policies across all tables in public schema
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'service_role_all_' || tbl.tablename, tbl.tablename);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
            'service_role_all_' || tbl.tablename,
            tbl.tablename
        );
    END LOOP;
END $$;

-- 3. Define Public Read-Only Policies for non-sensitive public catalog tables
DO $$
DECLARE
    pub_tbl TEXT;
    pub_tables TEXT[] := ARRAY[
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
        'helmet_sizes'
    ];
BEGIN
    FOREACH pub_tbl IN ARRAY pub_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = pub_tbl) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'public_read_' || pub_tbl, pub_tbl);
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);',
                'public_read_' || pub_tbl,
                pub_tbl
            );
        END IF;
    END LOOP;
END $$;

-- 4. Event Trigger: Automatically enable Row Level Security on any new table created in schema 'public'
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

DROP EVENT TRIGGER IF EXISTS auto_enable_rls_trigger;
CREATE EVENT TRIGGER auto_enable_rls_trigger
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION public.pgrst_auto_enable_rls();
