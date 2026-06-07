-- Aggiunge colonna country_code alla tabella logs per la mappa mondiale
ALTER TABLE logs ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Indice per query sulla mappa (filtra per tipo workout con country_code)
CREATE INDEX IF NOT EXISTS idx_logs_country ON logs (user_id, type, country_code) WHERE country_code IS NOT NULL;
