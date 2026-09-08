-- Fase 3.3: mapeamento manual das 11 competições do checklist do usuário.
-- "Brasileirão Série A" já tinha sido vinculada automaticamente (nome bate
-- exato) mas ainda sem confirmadoManualmente=true; as outras 8 nunca
-- teriam sido resolvidas pelo casamento automático de nome — os nomes em
-- português da OddsPapi não têm nenhuma relação textual óbvia com os
-- nomes que o usuário usa ("Liga dos Campeões da UEFA" para "UEFA
-- Champions League", "Taça Sul-Americana" para "Copa Sul-Americana",
-- "Liga Europa UEFA" para "UEFA Europa League") — por isso precisam do
-- mesmo seed manual que Série B e Primera División Argentina já tinham.
-- Todas as 9 abaixo foram testadas com odd real (Gols O/U) em pelo menos
-- uma das 3 casas confirmadas antes de marcar confirmadoManualmente=true.

UPDATE "TorneioMapeamento"
SET "confirmadoManualmente" = true, "atualizadoEm" = CURRENT_TIMESTAMP
WHERE "nomeInterno" = 'Brasileirão Série A';

INSERT INTO "TorneioMapeamento" ("id", "nomeInterno", "tournamentId", "tournamentName", "confirmadoManualmente", "atualizadoEm")
VALUES
  (gen_random_uuid()::text, 'Copa Libertadores', 384, 'Copa Libertadores', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Copa Sul-Americana', 480, 'Taça Sul-Americana', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UEFA Champions League', 7, 'Liga dos Campeões da UEFA', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UEFA Europa League', 679, 'Liga Europa UEFA', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'La Liga', 8, 'La Liga', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Serie A', 23, 'Série A', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Premier League', 17, 'Premier League', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Bundesliga', 35, 'Bundesliga', true, CURRENT_TIMESTAMP)
ON CONFLICT ("nomeInterno") DO UPDATE SET
  "tournamentId" = EXCLUDED."tournamentId",
  "tournamentName" = EXCLUDED."tournamentName",
  "confirmadoManualmente" = true,
  "atualizadoEm" = CURRENT_TIMESTAMP;
