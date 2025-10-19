DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_type t
	JOIN pg_namespace n ON n.oid = t.typnamespace
	WHERE t.typname = 'action_type' AND n.nspname = 'public'
)
THEN
	EXECUTE 'CREATE TYPE "public"."action_type" AS ENUM(''bet'', ''check'', ''call'', ''raise'', ''fold'', ''timeout'')';
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_type t
	JOIN pg_namespace n ON n.oid = t.typnamespace
	WHERE t.typname = 'actor_source' AND n.nspname = 'public'
)
THEN
	EXECUTE 'CREATE TYPE "public"."actor_source" AS ENUM(''human'', ''bot'')';
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_type t
	JOIN pg_namespace n ON n.oid = t.typnamespace
	WHERE t.typname = 'rank' AND n.nspname = 'public'
)
THEN
	EXECUTE 'CREATE TYPE "public"."rank" AS ENUM(''2'', ''3'', ''4'', ''5'', ''6'', ''7'', ''8'', ''9'', ''10'', ''J'', ''Q'', ''K'', ''A'')';
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_type t
	JOIN pg_namespace n ON n.oid = t.typnamespace
	WHERE t.typname = 'suit' AND n.nspname = 'public'
)
THEN
	EXECUTE 'CREATE TYPE "public"."suit" AS ENUM(''hearts'', ''diamonds'', ''clubs'', ''spades'')';
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_type t
	JOIN pg_namespace n ON n.oid = t.typnamespace
	WHERE t.typname = 'game_status' AND n.nspname = 'public'
)
THEN
	EXECUTE 'CREATE TYPE "public"."game_status" AS ENUM(''waiting'', ''active'', ''completed'')';
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_type t
	JOIN pg_namespace n ON n.oid = t.typnamespace
	WHERE t.typname = 'round_type' AND n.nspname = 'public'
)
THEN
	EXECUTE 'CREATE TYPE "public"."round_type" AS ENUM(''pre-flop'', ''flop'', ''turn'', ''river'', ''showdown'')';
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_type t
	JOIN pg_namespace n ON n.oid = t.typnamespace
	WHERE t.typname = 'user_role' AND n.nspname = 'public'
)
THEN
	EXECUTE 'CREATE TYPE "public"."user_role" AS ENUM(''user'', ''admin'', ''dev'')';
END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poker_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid,
	"hand_id" integer DEFAULT 0 NOT NULL,
	"action_type" "action_type" NOT NULL,
	"amount" integer,
	"actor_source" "actor_source" DEFAULT 'human' NOT NULL,
	"bot_strategy" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poker_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poker_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"hand_id" integer DEFAULT 0 NOT NULL,
	"game_id" uuid,
	"player_id" uuid,
	"reveal_at_showdown" boolean DEFAULT false,
	"rank" "rank" NOT NULL,
	"suit" "suit" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poker_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poker_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hand_id" integer DEFAULT 0 NOT NULL,
	"status" "game_status" DEFAULT 'waiting',
	"current_round" "round_type" DEFAULT 'pre-flop',
	"current_highest_bet" integer DEFAULT 0 NOT NULL,
	"current_player_turn" uuid,
	"last_aggressor_id" uuid,
	"pot" integer DEFAULT 0 NOT NULL,
	"big_blind" integer DEFAULT 20 NOT NULL,
	"small_blind" integer DEFAULT 10 NOT NULL,
	"turn_ms" integer DEFAULT 30000 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_action" "action_type" DEFAULT 'check',
	"last_bet_amount" integer DEFAULT 0,
	"turn_timeout_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "poker_games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poker_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"seat" integer NOT NULL,
	"stack" integer DEFAULT 1000 NOT NULL,
	"current_bet" integer,
	"has_folded" boolean DEFAULT false,
	"is_connected" boolean DEFAULT true,
	"last_seen" timestamp DEFAULT now(),
	"is_button" boolean DEFAULT false,
	"has_won" boolean DEFAULT false,
	"show_cards" boolean DEFAULT false,
	"display_name" text,
	"leave_after_hand" boolean DEFAULT false,
	"hand_rank" integer,
	"hand_value" integer,
	"hand_name" text
);
--> statement-breakpoint
ALTER TABLE "poker_players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poker_timeouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid,
	"player_id" uuid,
	"reported_by" uuid,
	"timeout_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poker_timeouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_actions_game_id_poker_games_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_actions" ADD CONSTRAINT "poker_actions_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_actions_player_id_poker_players_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_actions" ADD CONSTRAINT "poker_actions_player_id_poker_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."poker_players"("id") ON DELETE set null ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_cards_game_id_poker_games_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_cards" ADD CONSTRAINT "poker_cards_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE no action ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_cards_player_id_poker_players_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_cards" ADD CONSTRAINT "poker_cards_player_id_poker_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."poker_players"("id") ON DELETE no action ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_games_current_player_turn_poker_players_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_games" ADD CONSTRAINT "poker_games_current_player_turn_poker_players_id_fk" FOREIGN KEY ("current_player_turn") REFERENCES "public"."poker_players"("id") ON DELETE set null ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_players_user_id_users_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_players" ADD CONSTRAINT "poker_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_players_game_id_poker_games_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_players" ADD CONSTRAINT "poker_players_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_timeouts_game_id_poker_games_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_timeouts" ADD CONSTRAINT "poker_timeouts_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE no action ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_timeouts_player_id_poker_players_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_timeouts" ADD CONSTRAINT "poker_timeouts_player_id_poker_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."poker_players"("id") ON DELETE no action ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'poker_timeouts_reported_by_poker_players_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "poker_timeouts" ADD CONSTRAINT "poker_timeouts_reported_by_poker_players_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."poker_players"("id") ON DELETE no action ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
IF NOT EXISTS (
	SELECT 1 FROM pg_constraint c
	JOIN pg_class t ON t.oid = c.conrelid
	JOIN pg_namespace n ON n.oid = t.relnamespace
	WHERE c.conname = 'user_roles_user_id_users_id_fk' AND n.nspname = 'public'
)
THEN
	ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;--> statement-breakpoint
-- CREATE OR REPLACE VIEW "public"."cards" AS (select "id", "hand_id", "game_id", "player_id", "reveal_at_showdown", "rank", "suit" from "poker_cards");