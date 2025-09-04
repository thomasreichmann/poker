-- Add nullable last_aggressor_id to poker_games and FK to poker_players
ALTER TABLE "poker_games"
ADD COLUMN IF NOT EXISTS "last_aggressor_id" uuid NULL;

ALTER TABLE "poker_games"
ADD CONSTRAINT IF NOT EXISTS "poker_games_last_aggressor_fk"
FOREIGN KEY ("last_aggressor_id") REFERENCES "poker_players"("id")
ON UPDATE CASCADE ON DELETE SET NULL;