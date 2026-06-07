-- ─── TANDEMS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tandems (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tandem_id UUID REFERENCES public.tandems(id) ON DELETE SET NULL;

-- RLS tandems
ALTER TABLE public.tandems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tandems_select" ON public.tandems FOR SELECT USING (true);
CREATE POLICY "tandems_insert" ON public.tandems FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tandems_update" ON public.tandems FOR UPDATE USING (auth.uid() = created_by);

-- ─── CLAN CHALLENGES (mensili) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clan_challenges (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_clan_id  UUID REFERENCES public.clans(id) ON DELETE CASCADE,
  challenged_clan_id  UUID REFERENCES public.clans(id) ON DELETE CASCADE,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  winner_clan_id      UUID REFERENCES public.clans(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clan_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clan_challenges_select" ON public.clan_challenges FOR SELECT USING (true);
CREATE POLICY "clan_challenges_insert" ON public.clan_challenges FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.clans WHERE id = challenger_clan_id AND owner_id = auth.uid())
);

-- ─── TANDEM MATCHUPS (settimanali) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tandem_matchups (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tandem1_id       UUID REFERENCES public.tandems(id) ON DELETE CASCADE,
  tandem2_id       UUID REFERENCES public.tandems(id) ON DELETE CASCADE,
  week_start       DATE NOT NULL,
  week_end         DATE NOT NULL,
  winner_tandem_id UUID REFERENCES public.tandems(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tandem_matchups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tandem_matchups_select" ON public.tandem_matchups FOR SELECT USING (true);
CREATE POLICY "tandem_matchups_insert" ON public.tandem_matchups FOR INSERT WITH CHECK (auth.role() = 'authenticated');
