-- Simulator: add actor_source enum and annotate actions; add simulator_config on games
-- Up
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_source') THEN
    CREATE TYPE actor_source AS ENUM ('human', 'bot');
  END IF;
END $$;

ALTER TABLE IF EXISTS public.poker_actions
  ADD COLUMN IF NOT EXISTS hand_id integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actor_source actor_source NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS bot_strategy text;

ALTER TABLE IF EXISTS public.poker_games
  ADD COLUMN IF NOT EXISTS simulator_config jsonb;

-- Down (best-effort; non-destructive)
-- Note: We won't drop columns/enums automatically to avoid data loss in dev/staging.
-- To rollback manually:
-- ALTER TABLE public.poker_actions DROP COLUMN IF EXISTS bot_strategy;
-- ALTER TABLE public.poker_actions DROP COLUMN IF EXISTS actor_source;
-- ALTER TABLE public.poker_actions DROP COLUMN IF EXISTS hand_id;
-- ALTER TABLE public.poker_games DROP COLUMN IF EXISTS simulator_config;
-- DROP TYPE IF EXISTS actor_source;