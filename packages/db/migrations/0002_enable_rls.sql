-- Lock down the Supabase Data API (PostgREST).
--
-- All access to these tables goes through our server-side Postgres connection
-- (table owner — unaffected by RLS). The public anon/authenticated roles must
-- see nothing: enable RLS on every table with NO policies (default deny), and
-- revoke the default grants for good measure. If a table ever needs direct
-- client reads, that's a deliberate policy added in a later migration.

DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

-- Future tables: strip anon/authenticated from default privileges too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
