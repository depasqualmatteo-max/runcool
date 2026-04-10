-- Elimina clan senza utenti attivi
DELETE FROM clans
WHERE id NOT IN (
  SELECT DISTINCT clan_id FROM profiles WHERE clan_id IS NOT NULL
);

-- Elimina tandem senza utenti attivi
DELETE FROM tandems
WHERE id NOT IN (
  SELECT DISTINCT tandem_id FROM profiles WHERE tandem_id IS NOT NULL
);

-- Elimina sfide di clan che non esistono più
DELETE FROM clan_challenges
WHERE challenger_clan_id NOT IN (SELECT id FROM clans)
   OR challenged_clan_id NOT IN (SELECT id FROM clans);

-- Elimina matchup di tandem che non esistono più
DELETE FROM tandem_matchups
WHERE tandem_a_id NOT IN (SELECT id FROM tandems)
   OR tandem_b_id NOT IN (SELECT id FROM tandems);
