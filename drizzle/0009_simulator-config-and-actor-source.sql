-- Add simulator_config to games and actor source annotations to actions

-- simulator_config on poker_games
ALTER TABLE IF EXISTS poker_games
ADD COLUMN IF NOT EXISTS simulator_config jsonb;

-- actor_source enum and columns on poker_actions
DO $$ BEGIN
  CREATE TYPE actor_source AS ENUM ('human', 'bot');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS poker_actions
ADD COLUMN IF NOT EXISTS actor_source actor_source NOT NULL DEFAULT 'human',
ADD COLUMN IF NOT EXISTS bot_strategy text;