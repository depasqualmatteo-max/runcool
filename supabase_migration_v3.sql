-- ============================================================
-- RUNCOOL - Migrazione v3: Feed globale
-- Esegui nel Supabase SQL Editor
-- ============================================================

-- Assicura che logs.user_id abbia FK verso profiles (per il join nel feed)
-- Se la FK esiste già non fa nulla grazie a IF NOT EXISTS

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'logs_user_id_profiles_fkey'
      AND table_name = 'logs'
  ) THEN
    ALTER TABLE public.logs
      ADD CONSTRAINT logs_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Abilita realtime anche per logs (per il feed in tempo reale)
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;

-- Indice per velocizzare il feed
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);
