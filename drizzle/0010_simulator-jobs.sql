-- Simulator jobs for serverless bot processing
-- Creates a durable queue to schedule and process bot actions

CREATE TYPE sim_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS poker_simulator_jobs (
  id SERIAL PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES poker_games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES poker_players(id) ON DELETE CASCADE,
  hand_id INTEGER NOT NULL DEFAULT 0,
  run_at TIMESTAMP NOT NULL DEFAULT now(),
  status sim_job_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  locked_at TIMESTAMP
);

-- Fast lookup for due jobs
CREATE INDEX IF NOT EXISTS idx_sim_jobs_due
  ON poker_simulator_jobs (run_at)
  WHERE status = 'pending';

-- Prevent duplicate pending jobs per game/hand/player (treat NULL player_id as a constant)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sim_jobs_pending
  ON poker_simulator_jobs (game_id, hand_id, COALESCE(player_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'pending';

-- Keep table lean
CREATE INDEX IF NOT EXISTS idx_sim_jobs_status
  ON poker_simulator_jobs (status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at ON poker_simulator_jobs;
CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON poker_simulator_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();