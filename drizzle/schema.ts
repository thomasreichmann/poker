import { pgTable, type AnyPgColumn, foreignKey, uuid, integer, timestamp, serial, text, boolean, unique, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const actionType = pgEnum("action_type", ['bet', 'check', 'call', 'raise', 'fold', 'timeout'])
export const actorSource = pgEnum("actor_source", ['human', 'bot'])
export const gameStatus = pgEnum("game_status", ['waiting', 'active', 'completed'])
export const rank = pgEnum("rank", ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'])
export const roundType = pgEnum("round_type", ['pre-flop', 'flop', 'turn', 'river', 'showdown'])
export const suit = pgEnum("suit", ['hearts', 'diamonds', 'clubs', 'spades'])
export const userRole = pgEnum("user_role", ['user', 'admin', 'dev'])


export const pokerGames = pgTable("poker_games", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	status: gameStatus().default('waiting'),
	currentRound: roundType("current_round").default('pre-flop'),
	currentHighestBet: integer("current_highest_bet").default(0).notNull(),
	currentPlayerTurn: uuid("current_player_turn"),
	pot: integer().default(0).notNull(),
	bigBlind: integer("big_blind").default(20).notNull(),
	smallBlind: integer("small_blind").default(10).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	handId: integer("hand_id").default(0).notNull(),
	lastAction: actionType("last_action").default('check'),
	lastBetAmount: integer("last_bet_amount").default(0),
	lastAggressorId: uuid("last_aggressor_id"),
	turnMs: integer("turn_ms").default(30000).notNull(),
	turnTimeoutAt: timestamp("turn_timeout_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.currentPlayerTurn],
			foreignColumns: [pokerPlayers.id],
			name: "poker_games_current_player_turn_poker_players_id_fk"
		}).onDelete("set null"),
]);

export const pokerTimeouts = pgTable("poker_timeouts", {
	id: serial().primaryKey().notNull(),
	gameId: uuid("game_id"),
	playerId: uuid("player_id"),
	reportedBy: uuid("reported_by"),
	timeoutAt: timestamp("timeout_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [pokerGames.id],
			name: "poker_timeouts_game_id_poker_games_id_fk"
		}),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [pokerPlayers.id],
			name: "poker_timeouts_player_id_poker_players_id_fk"
		}),
	foreignKey({
			columns: [table.reportedBy],
			foreignColumns: [pokerPlayers.id],
			name: "poker_timeouts_reported_by_poker_players_id_fk"
		}),
]);

export const pokerActions = pgTable("poker_actions", {
	id: serial().primaryKey().notNull(),
	gameId: uuid("game_id").notNull(),
	playerId: uuid("player_id"),
	actionType: actionType("action_type").notNull(),
	amount: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	handId: integer("hand_id").default(0).notNull(),
	actorSource: actorSource("actor_source").default('human').notNull(),
	botStrategy: text("bot_strategy"),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [pokerGames.id],
			name: "poker_actions_game_id_poker_games_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [pokerPlayers.id],
			name: "poker_actions_player_id_poker_players_id_fk"
		}).onDelete("set null"),
]);

export const pokerCards = pgTable("poker_cards", {
	id: serial().primaryKey().notNull(),
	gameId: uuid("game_id"),
	playerId: uuid("player_id"),
	rank: rank().notNull(),
	suit: suit().notNull(),
	handId: integer("hand_id").default(0).notNull(),
	revealAtShowdown: boolean("reveal_at_showdown").default(false),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [pokerGames.id],
			name: "poker_cards_game_id_poker_games_id_fk"
		}),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [pokerPlayers.id],
			name: "poker_cards_player_id_poker_players_id_fk"
		}),
]);

export const pokerPlayers = pgTable("poker_players", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	gameId: uuid("game_id").notNull(),
	seat: integer().notNull(),
	stack: integer().default(1000).notNull(),
	currentBet: integer("current_bet"),
	hasFolded: boolean("has_folded").default(false),
	isConnected: boolean("is_connected").default(true),
	lastSeen: timestamp("last_seen", { mode: 'string' }).defaultNow(),
	isButton: boolean("is_button").default(false),
	hasWon: boolean("has_won").default(false),
	showCards: boolean("show_cards").default(false),
	handRank: integer("hand_rank"),
	handValue: integer("hand_value"),
	handName: text("hand_name"),
	displayName: text("display_name"),
	leaveAfterHand: boolean("leave_after_hand").default(false),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [pokerGames.id],
			name: "poker_players_game_id_poker_games_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "poker_players_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userRoles = pgTable("user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	role: userRole().default('user').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_roles_user_id_unique").on(table.userId),
]);
export const cards = pgView("cards", {	id: integer(),
	handId: integer("hand_id"),
	gameId: uuid("game_id"),
	playerId: uuid("player_id"),
	revealAtShowdown: boolean("reveal_at_showdown"),
	rank: rank(),
	suit: suit(),
}).as(sql`SELECT poker_cards.id, poker_cards.hand_id, poker_cards.game_id, poker_cards.player_id, poker_cards.reveal_at_showdown, poker_cards.rank, poker_cards.suit FROM poker_cards`);