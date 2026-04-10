-- v5: Tandem invite system + cleanup

-- Aggiungi campi invito alla tabella tandems
ALTER TABLE tandems ADD COLUMN IF NOT EXISTS invited_user_id UUID REFERENCES auth.users(id);
ALTER TABLE tandems ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- I tandem esistenti restano 'active'
-- I nuovi tandem partono come 'pending' fino a che il partner accetta

-- Indice per trovare velocemente gli inviti pendenti di un utente
CREATE INDEX IF NOT EXISTS idx_tandems_invited_user ON tandems(invited_user_id) WHERE status = 'pending';

-- RLS: l'utente invitato può vedere e aggiornare il proprio invito
CREATE POLICY IF NOT EXISTS "Users can view their tandem invites"
  ON tandems FOR SELECT
  USING (invited_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Invited user can accept/decline"
  ON tandems FOR UPDATE
  USING (invited_user_id = auth.uid())
  WITH CHECK (invited_user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Creator can delete pending tandem"
  ON tandems FOR DELETE
  USING (created_by = auth.uid());
