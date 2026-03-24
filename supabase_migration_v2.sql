-- ============================================================
-- RUNCOOL - Migrazione v2: Avatar + Chat
-- Esegui nel Supabase SQL Editor
-- ============================================================

-- 1. Aggiungi avatar_url alla tabella profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Crea tabella MESSAGES per la chat
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RLS per messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_all"  ON public.messages FOR SELECT  USING (true);
CREATE POLICY "messages_insert_auth" ON public.messages FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_delete_own"  ON public.messages FOR DELETE  USING (auth.uid() = user_id);

-- 4. Abilita realtime per la tabella messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================================
-- IMPORTANTE: Dopo questo SQL, vai su:
-- Supabase Dashboard → Storage → New bucket
-- Nome: avatars
-- Public bucket: ✅ SI (spunta "Public bucket")
-- ============================================================
