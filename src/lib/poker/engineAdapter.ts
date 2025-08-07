import { TRPCError } from "@trpc/server";
import type { ActInput } from "~/server/api/routers/player/action";
import type { AuthenticatedTRPCContext as Context } from "~/server/api/trpc";

import {
  addPlayerToGame,
  advanceToNextPlayer,
  advanceToNextRound,
  createInitialGameState,
  executeGameAction,
  handleShowdown,
  handleSinglePlayerWin,
  startNewGame,
  validateAction,
  type GameAction,
  type GameState,
} from "./pureEngine";

import { ActionRepository } from "~/server/db/repos/actionRepository";
import { GameRepository } from "~/server/db/repos/gameRepository";
import { PlayerRepository } from "~/server/db/repos/playerRepository";
import { type Game } from "~/server/db/schema/games";
import { type Player } from "~/server/db/schema/players";

export async function dbGameToPureGame(ctx: Context, gameId: string): Promise<GameState> {
  const gameRepository = new GameRepository(ctx);
  return await gameRepository.getGameWithPlayers(gameId);
}

export async function persistPureGameState(
  ctx: Context, 
  pureGameState: GameState, 
  previousState?: GameState
): Promise<Game> {
  const gameRepository = new GameRepository(ctx);
  return await gameRepository.persistGameState(pureGameState, previousState);
}

export async function handleJoinGamePure(ctx: Context, gameId: string, stack: number): Promise<Player> {
  const previousState = await dbGameToPureGame(ctx, gameId);
  const newGameState = addPlayerToGame(previousState, ctx.user.id, stack);
  await persistPureGameState(ctx, newGameState, previousState);
  
  const playerRepository = new PlayerRepository(ctx);
  return await playerRepository.createPlayer({
    gameId,
    userId: ctx.user.id,
    seat: newGameState.players.length - 1,
    stack,
  });
}

export async function handleActionPure(ctx: Context, input: ActInput, playerId: string): Promise<Game> {
  const previousState = await dbGameToPureGame(ctx, input.gameId);
  
  const pureAction: GameAction = {
    playerId,
    action: input.action as "bet" | "check" | "fold" | "call" | "raise",
    amount: "amount" in input ? input.amount : undefined,
  };

  const validation = validateAction(previousState, pureAction);
  if (!validation.isValid) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: validation.error ?? "Invalid action" 
    });
  }

  const actionRepository = new ActionRepository(ctx);
  await actionRepository.createAction(input.gameId, playerId, input);

  const newGameState = executeGameAction(previousState, pureAction);
  return await persistPureGameState(ctx, newGameState, previousState);
}

export async function nextPlayerPure(ctx: Context, game: Game): Promise<Game> {
  const previousState = await dbGameToPureGame(ctx, game.id);
  const newGameState = advanceToNextPlayer(previousState);
  return await persistPureGameState(ctx, newGameState, previousState);
}

export async function resetGamePure(ctx: Context, gameId: string): Promise<Game> {
  const currentGameState = await dbGameToPureGame(ctx, gameId);
  
  const resetGameState: GameState = {
    ...createInitialGameState(gameId, currentGameState.bigBlind, currentGameState.smallBlind),
    players: currentGameState.players.map(player => ({
      ...player,
      stack: 1000,
      currentBet: 0,
      hasFolded: false,
      hasWon: false,
      showCards: false,
      isButton: false,
      handRank: undefined,
      handValue: undefined,
      handName: undefined,
      holeCards: [],
    })),
  };

  const gameRepository = new GameRepository(ctx);
  await gameRepository.deleteAllCards(gameId);
  const updatedGame = await persistPureGameState(ctx, resetGameState, currentGameState);

  if (resetGameState.players.length >= 2) {
    const gameWithPlayers = await dbGameToPureGame(ctx, gameId);
    const startedGame = startNewGame(gameWithPlayers);
    return await persistPureGameState(ctx, startedGame, gameWithPlayers);
  }

  return updatedGame;
}

export async function advanceGameStatePure(ctx: Context, game: Game): Promise<Game> {
  const previousState = await dbGameToPureGame(ctx, game.id);
  const activePlayers = previousState.players.filter(p => !p.hasFolded);
  
  if (activePlayers.length === 1) {
    const newGameState = handleSinglePlayerWin(previousState);
    return await persistPureGameState(ctx, newGameState, previousState);
  }

  const allPlayersActed = activePlayers.every(player => 
    player.currentBet === previousState.currentHighestBet || player.stack === 0
  );

  if (!allPlayersActed) {
    const newGameState = advanceToNextPlayer(previousState);
    return await persistPureGameState(ctx, newGameState, previousState);
  }

  if (previousState.currentRound === "river") {
    const newGameState = handleShowdown(previousState);
    return await persistPureGameState(ctx, newGameState, previousState);
  } else if (previousState.currentRound === "showdown") {
    return await resetGamePure(ctx, game.id);
  } else {
    const newGameState = advanceToNextRound(previousState);
    return await persistPureGameState(ctx, newGameState, previousState);
  }
}