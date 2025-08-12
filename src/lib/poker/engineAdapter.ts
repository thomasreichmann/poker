import { db } from "@/db";
import { actions } from "@/db/schema/actions";
import { cards as cardsTable } from "@/db/schema/cards";
import { games, type Game } from "@/db/schema/games";
import { players as playersTable, type Player } from "@/db/schema/players";
import { and, eq, sql } from "drizzle-orm";
import { generateDeck, getAvailableCards } from "./cards";
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
import type {
  ActionType as EngineActionType,
  GameStatus,
  RoundType,
} from "./types";

type ActionInput = {
  gameId: string;
  action: "bet" | "check" | "fold" | "call" | "raise";
  amount?: number;
};

export async function dbGameToPureGame(gameId: string): Promise<GameState> {
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!game) throw new Error("Game not found");

  const gamePlayers = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.gameId, gameId));
  const gameCards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.gameId, gameId));

  const communityCards = gameCards
    .filter((c) => c.playerId === null)
    .map((c) => ({ rank: c.rank, suit: c.suit }));

  const players: GameState["players"] = gamePlayers
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      id: p.id,
      seat: p.seat,
      stack: p.stack,
      currentBet: p.currentBet ?? 0,
      hasFolded: p.hasFolded ?? false,
      isButton: p.isButton ?? false,
      hasWon: p.hasWon ?? false,
      showCards: p.showCards ?? false,
      handRank: p.handRank ?? undefined,
      handValue: p.handValue ?? undefined,
      handName: p.handName ?? undefined,
      holeCards: gameCards
        .filter((c) => c.playerId === p.id)
        .map((c) => ({ rank: c.rank, suit: c.suit })),
    }));

  const dealtCards = [
    ...communityCards,
    ...players.flatMap((pl) => pl.holeCards),
  ];
  const deck = getAvailableCards(generateDeck(), dealtCards);

  const pureState: GameState = {
    id: game.id,
    status: (game.status ?? "waiting") as GameStatus,
    currentRound: (game.currentRound ?? "pre-flop") as RoundType,
    currentHighestBet: game.currentHighestBet ?? 0,
    currentPlayerTurn: game.currentPlayerTurn ?? undefined,
    pot: game.pot,
    bigBlind: game.bigBlind,
    smallBlind: game.smallBlind,
    lastAction:
      game.lastAction &&
      game.lastAction !== ("timeout" as unknown as EngineActionType)
        ? (game.lastAction as EngineActionType)
        : undefined,
    lastBetAmount: game.lastBetAmount ?? 0,
    players,
    communityCards,
    deck: deck.map((c) => ({ rank: c.rank as any, suit: c.suit as any })),
  };

  return pureState;
}

export async function persistPureGameState(
  pureGameState: GameState,
  _previousState?: GameState
): Promise<Game> {
  return await db.transaction(async (tx) => {
    // Serialize all writes per game to avoid interleaving (e.g., multi-client advance/reset)
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${pureGameState.id}))`
    );

    const [updated] = await tx
      .update(games)
      .set({
        status: pureGameState.status,
        currentRound: pureGameState.currentRound,
        currentHighestBet: pureGameState.currentHighestBet,
        currentPlayerTurn: pureGameState.currentPlayerTurn ?? null,
        pot: pureGameState.pot,
        bigBlind: pureGameState.bigBlind,
        smallBlind: pureGameState.smallBlind,
        lastAction: pureGameState.lastAction ?? null,
        lastBetAmount: pureGameState.lastBetAmount,
        updatedAt: new Date(),
      })
      .where(eq(games.id, pureGameState.id))
      .returning();

    // Update players
    for (const p of pureGameState.players) {
      await tx
        .update(playersTable)
        .set({
          seat: p.seat,
          stack: p.stack,
          currentBet: p.currentBet,
          hasFolded: p.hasFolded,
          isButton: p.isButton,
          hasWon: p.hasWon,
          showCards: p.showCards,
          handRank: p.handRank ?? null,
          handValue: p.handValue ?? null,
          handName: p.handName ?? null,
        })
        .where(eq(playersTable.id, p.id));
    }

    // Replace dealt cards for this game atomically
    await tx.delete(cardsTable).where(eq(cardsTable.gameId, pureGameState.id));

    const newCards: Array<
      Parameters<typeof db.insert>[0] extends never
        ? never
        : { gameId: string; playerId: string | null; rank: any; suit: any }
    > = [];

    // Community cards
    for (const c of pureGameState.communityCards) {
      newCards.push({
        gameId: pureGameState.id,
        playerId: null,
        rank: c.rank as any,
        suit: c.suit as any,
      });
    }
    // Hole cards
    for (const pl of pureGameState.players) {
      for (const c of pl.holeCards) {
        newCards.push({
          gameId: pureGameState.id,
          playerId: pl.id,
          rank: c.rank as any,
          suit: c.suit as any,
        });
      }
    }

    if (newCards.length > 0) {
      await tx.insert(cardsTable).values(newCards);
    }

    return updated;
  });
}

export async function handleJoinGamePure(
  userId: string,
  gameId: string,
  stack: number
): Promise<Player> {
  const prev = await dbGameToPureGame(gameId);
  const newSeat = prev.players.length;

  // Create player first to get a stable playerId used by engine state
  const [created] = await db
    .insert(playersTable)
    .values({ gameId, userId, seat: newSeat, stack })
    .returning();

  const newGameState = addPlayerToGame(prev, created.id, stack);
  await persistPureGameState(newGameState, prev);
  return created;
}

export async function handleActionPure(
  input: ActionInput & { playerId: string }
): Promise<Game> {
  const previousState = await dbGameToPureGame(input.gameId);

  const pureAction: GameAction = {
    playerId: input.playerId,
    action: input.action,
    amount: input.amount,
  };

  const validation = validateAction(previousState, pureAction);
  if (!validation.isValid) {
    throw new Error(validation.error ?? "Invalid action");
  }

  await db.insert(actions).values({
    gameId: input.gameId,
    playerId: input.playerId,
    actionType: input.action,
    amount: input.amount ?? null,
  });

  const newGameState = executeGameAction(previousState, pureAction);
  return await persistPureGameState(newGameState, previousState);
}

export async function nextPlayerPure(gameId: string): Promise<Game> {
  const previousState = await dbGameToPureGame(gameId);
  const newGameState = advanceToNextPlayer(previousState);
  return await persistPureGameState(newGameState, previousState);
}

export async function resetGamePure(gameId: string): Promise<Game> {
  const currentGameState = await dbGameToPureGame(gameId);

  // Rotate dealer button to next seated player
  const sortedPlayers = [...currentGameState.players].sort(
    (a, b) => a.seat - b.seat
  );
  const currentButtonIdx = sortedPlayers.findIndex((p) => p.isButton);
  const nextButtonIdx =
    currentButtonIdx === -1 ? 0 : (currentButtonIdx + 1) % sortedPlayers.length;

  const resetGameState: GameState = {
    ...createInitialGameState(
      gameId,
      currentGameState.bigBlind,
      currentGameState.smallBlind
    ),
    // Preserve stacks, clear round-specific state, and set next button
    players: sortedPlayers.map((player, index) => ({
      ...player,
      currentBet: 0,
      hasFolded: false,
      hasWon: false,
      showCards: false,
      isButton: index === nextButtonIdx,
      handRank: undefined,
      handValue: undefined,
      handName: undefined,
      holeCards: [],
    })),
  };

  // Clear dealt cards
  await db.delete(cardsTable).where(eq(cardsTable.gameId, gameId));
  const updatedGame = await persistPureGameState(
    resetGameState,
    currentGameState
  );

  if (resetGameState.players.length >= 2) {
    // Remove players who opted to leave after the hand BEFORE building next hand state
    await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.gameId, gameId),
          eq(playersTable.leaveAfterHand as any, true)
        )
      );

    // Rebuild state after removals
    const gameWithPlayers = await dbGameToPureGame(gameId);
    if (gameWithPlayers.players.length >= 2) {
      const startedGame = startNewGame(gameWithPlayers);
      return await persistPureGameState(startedGame, gameWithPlayers);
    }
  }

  return updatedGame;
}

export async function advanceGameStatePure(gameId: string): Promise<Game> {
  const previousState = await dbGameToPureGame(gameId);
  const activePlayers = previousState.players.filter((p) => !p.hasFolded);

  // If we're already in showdown, reset to a new hand
  if (previousState.currentRound === "showdown") {
    return await resetGamePure(gameId);
  }

  if (activePlayers.length === 1) {
    const newGameState = handleSinglePlayerWin(previousState);
    return await persistPureGameState(newGameState, previousState);
  }

  const allPlayersActed = activePlayers.every(
    (player) =>
      player.currentBet === previousState.currentHighestBet ||
      player.stack === 0
  );

  if (!allPlayersActed) {
    const newGameState = advanceToNextPlayer(previousState);
    return await persistPureGameState(newGameState, previousState);
  }

  if (previousState.currentRound === "river") {
    const newGameState = handleShowdown(previousState);
    return await persistPureGameState(newGameState, previousState);
  } else {
    const newGameState = advanceToNextRound(previousState);
    return await persistPureGameState(newGameState, previousState);
  }
}

export async function leaveGamePure(
  userId: string,
  gameId: string
): Promise<Game> {
  // Soft-leave: mark player to be removed after the current hand. Do not modify engine state.
  const existing = await db
    .select()
    .from(playersTable)
    .where(
      and(eq(playersTable.gameId, gameId), eq(playersTable.userId, userId))
    )
    .limit(1);

  const player = existing[0];
  if (player) {
    await db
      .update(playersTable)
      .set({ leaveAfterHand: true, isConnected: false, lastSeen: new Date() })
      .where(eq(playersTable.id, player.id));
  }

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!game) throw new Error("Game not found");
  return game;
}
