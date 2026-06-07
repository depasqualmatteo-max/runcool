-- v6: Fix RLS per feed, classifiche e tandem inviti

-- ==========================================
-- LOGS: tutti gli utenti autenticati possono leggere tutti i log (per feed e classifiche)
-- ==========================================
DROP POLICY IF EXISTS "Users can read all logs" ON logs;
CREATE POLICY "Users can read all logs"
  ON logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==========================================
-- PROFILES: tutti gli utenti autenticati possono leggere tutti i profili
-- ==========================================
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==========================================
-- TANDEMS: tutti gli autenticati possono leggere i tandem (per classifiche)
-- L'utente invitato può accettare/rifiutare, il creatore può eliminare
-- ==========================================
DROP POLICY IF EXISTS "Authenticated users can read tandems" ON tandems;
CREATE POLICY "Authenticated users can read tandems"
  ON tandems FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their tandem invites" ON tandems;
DROP POLICY IF EXISTS "Invited user can accept/decline" ON tandems;
DROP POLICY IF EXISTS "Creator can delete pending tandem" ON tandems;

CREATE POLICY "Invited user can accept tandem"
  ON tandems FOR UPDATE
  USING (invited_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Creator or invited can delete tandem"
  ON tandems FOR DELETE
  USING (created_by = auth.uid() OR invited_user_id = auth.uid());

CREATE POLICY "Authenticated users can create tandems"
  ON tandems FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- CLANS: tutti possono leggere (per classifiche)
-- ==========================================
DROP POLICY IF EXISTS "Authenticated users can read clans" ON clans;
CREATE POLICY "Authenticated users can read clans"
  ON clans FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==========================================
-- TANDEM_MATCHUPS: tutti possono leggere
-- ==========================================
DROP POLICY IF EXISTS "Authenticated users can read matchups" ON tandem_matchups;
CREATE POLICY "Authenticated users can read matchups"
  ON tandem_matchups FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==========================================
-- Pulizia tandem pending vecchi (più di 7 giorni)
-- ==========================================
DELETE FROM tandems WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days';
