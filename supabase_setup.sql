-- ============================================================
-- RUNCOOL - Script SQL da eseguire nel Supabase SQL Editor
-- ============================================================

-- 1. Tabella CLANS
CREATE TABLE public.clans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabella PROFILES (un record per ogni utente registrato)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  hearts INTEGER NOT NULL DEFAULT 10,
  clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabella LOGS (ogni drink o allenamento)
CREATE TABLE public.logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('drink', 'workout')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  calories NUMERIC NOT NULL,
  hearts_delta NUMERIC NOT NULL,
  duration_minutes NUMERIC,
  km NUMERIC,
  elevation_meters NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trigger: crea automaticamente il profilo quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, hearts)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    10
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Abilita Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- 6. Policy PROFILES: tutti possono leggere, ognuno può modificare solo il suo
CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 7. Policy CLANS: tutti possono leggere, solo utenti autenticati possono creare
CREATE POLICY "clans_select_all"   ON public.clans FOR SELECT USING (true);
CREATE POLICY "clans_insert_auth"  ON public.clans FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "clans_update_owner" ON public.clans FOR UPDATE USING (auth.uid() = owner_id);

-- 8. Policy LOGS: ogni utente vede e gestisce solo i suoi log
CREATE POLICY "logs_select_own" ON public.logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "logs_insert_own" ON public.logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs_delete_own" ON public.logs FOR DELETE USING (auth.uid() = user_id);
