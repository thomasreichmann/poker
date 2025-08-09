CREATE TYPE "public"."action_type" AS ENUM('bet', 'check', 'call', 'raise', 'fold', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."rank" AS ENUM('2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A');--> statement-breakpoint
CREATE TYPE "public"."suit" AS ENUM('hearts', 'diamonds', 'clubs', 'spades');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('waiting', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."round_type" AS ENUM('pre-flop', 'flop', 'turn', 'river', 'showdown');--> statement-breakpoint
CREATE TABLE "poker_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"action_type" "action_type" NOT NULL,
	"amount" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid,
	"player_id" uuid,
	"rank" "rank" NOT NULL,
	"suit" "suit" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poker_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "game_status" DEFAULT 'waiting',
	"current_round" "round_type" DEFAULT 'pre-flop',
	"current_highest_bet" integer DEFAULT 0 NOT NULL,
	"current_player_turn" uuid,
	"pot" integer DEFAULT 0 NOT NULL,
	"big_blind" integer DEFAULT 20 NOT NULL,
	"small_blind" integer DEFAULT 10 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_action" "action_type" DEFAULT 'check',
	"last_bet_amount" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "poker_players" (
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
	"hand_rank" integer,
	"hand_value" integer,
	"hand_name" text
);
--> statement-breakpoint
CREATE TABLE "poker_timeouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid,
	"player_id" uuid,
	"reported_by" uuid,
	"timeout_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "poker_actions" ADD CONSTRAINT "poker_actions_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_actions" ADD CONSTRAINT "poker_actions_player_id_poker_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."poker_players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_player_id_poker_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."poker_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_players" ADD CONSTRAINT "poker_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_players" ADD CONSTRAINT "poker_players_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_timeouts" ADD CONSTRAINT "poker_timeouts_game_id_poker_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."poker_games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_timeouts" ADD CONSTRAINT "poker_timeouts_player_id_poker_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."poker_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poker_timeouts" ADD CONSTRAINT "poker_timeouts_reported_by_poker_players_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."poker_players"("id") ON DELETE no action ON UPDATE no action;