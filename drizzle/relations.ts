import { relations } from "drizzle-orm/relations";
import { pokerPlayers, pokerGames, pokerTimeouts, pokerActions, pokerCards, usersInAuth, userRoles } from "./schema";

export const pokerGamesRelations = relations(pokerGames, ({one, many}) => ({
	pokerPlayer: one(pokerPlayers, {
		fields: [pokerGames.currentPlayerTurn],
		references: [pokerPlayers.id],
		relationName: "pokerGames_currentPlayerTurn_pokerPlayers_id"
	}),
	pokerTimeouts: many(pokerTimeouts),
	pokerActions: many(pokerActions),
	pokerCards: many(pokerCards),
	pokerPlayers: many(pokerPlayers, {
		relationName: "pokerPlayers_gameId_pokerGames_id"
	}),
}));

export const pokerPlayersRelations = relations(pokerPlayers, ({one, many}) => ({
	pokerGames: many(pokerGames, {
		relationName: "pokerGames_currentPlayerTurn_pokerPlayers_id"
	}),
	pokerTimeouts_playerId: many(pokerTimeouts, {
		relationName: "pokerTimeouts_playerId_pokerPlayers_id"
	}),
	pokerTimeouts_reportedBy: many(pokerTimeouts, {
		relationName: "pokerTimeouts_reportedBy_pokerPlayers_id"
	}),
	pokerActions: many(pokerActions),
	pokerCards: many(pokerCards),
	pokerGame: one(pokerGames, {
		fields: [pokerPlayers.gameId],
		references: [pokerGames.id],
		relationName: "pokerPlayers_gameId_pokerGames_id"
	}),
	usersInAuth: one(usersInAuth, {
		fields: [pokerPlayers.userId],
		references: [usersInAuth.id]
	}),
}));

export const pokerTimeoutsRelations = relations(pokerTimeouts, ({one}) => ({
	pokerGame: one(pokerGames, {
		fields: [pokerTimeouts.gameId],
		references: [pokerGames.id]
	}),
	pokerPlayer_playerId: one(pokerPlayers, {
		fields: [pokerTimeouts.playerId],
		references: [pokerPlayers.id],
		relationName: "pokerTimeouts_playerId_pokerPlayers_id"
	}),
	pokerPlayer_reportedBy: one(pokerPlayers, {
		fields: [pokerTimeouts.reportedBy],
		references: [pokerPlayers.id],
		relationName: "pokerTimeouts_reportedBy_pokerPlayers_id"
	}),
}));

export const pokerActionsRelations = relations(pokerActions, ({one}) => ({
	pokerGame: one(pokerGames, {
		fields: [pokerActions.gameId],
		references: [pokerGames.id]
	}),
	pokerPlayer: one(pokerPlayers, {
		fields: [pokerActions.playerId],
		references: [pokerPlayers.id]
	}),
}));

export const pokerCardsRelations = relations(pokerCards, ({one}) => ({
	pokerGame: one(pokerGames, {
		fields: [pokerCards.gameId],
		references: [pokerGames.id]
	}),
	pokerPlayer: one(pokerPlayers, {
		fields: [pokerCards.playerId],
		references: [pokerPlayers.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	pokerPlayers: many(pokerPlayers),
	userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userRoles.userId],
		references: [usersInAuth.id]
	}),
}));