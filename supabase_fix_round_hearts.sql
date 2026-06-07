-- Arrotonda tutti i punteggi degli utenti a interi
UPDATE profiles SET hearts = ROUND(hearts) WHERE hearts != ROUND(hearts);

-- Arrotonda tutti i hearts_delta nei log a interi
UPDATE logs SET hearts_delta = ROUND(hearts_delta) WHERE hearts_delta != ROUND(hearts_delta);
