import { db } from "@/db";
import { actions } from "@/db/schema/actions";
import { type PokerAction } from "@/db/schema/actionTypes";
import { cards as cardsTable } from "@/db/schema/cards";
import { games, type Game } from "@/db/schema/games";
import { players as playersTable, type Player } from "@/db/schema/players";
import { hasArrayChanges, shallowEqualByKeys } from "@/lib/utils";
import { and, eq, inArray, not, sql } from "drizzle-orm";
import { CardBase, generateDeck, getAvailableCards } from "./cards";
import {
  addPlayerToGame,
  advanceToNextPlayer,
  advanceToNextRound,
  createInitialGameState,
  executeGameAction,
  forceFoldPlayer,
  handleShowdown,
  handleSinglePlayerWin,
  startNewGame,
  timeoutPlayer,
  validateAction,
  type GameAction,
  type GameState,
} from "./pureEngine";
import type {
  ActionType,
  ActionType as EngineActionType,
  GameStatus,
  Rank,
  RoundType,
  Suit,
} from "./types";

type ActionInput = {
  gameId: string;
  action: PokerAction;
  amount?: number;
  // Optional actor metadata (dev/QA simulator)
  actorSource?: "human" | "bot";
  botStrategy?: string | null;
  // Back-compat shim used by BotManager until callers are updated
  __actorSource?: "human" | "bot";
  __botStrategy?: string | null;
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
  const deck = getAvailableCards(generateDeck(), dealtCards as CardBase[]);

  const pureState: GameState = {
    id: game.id,
    handId: game.handId ?? 0,
    status: (game.status ?? "waiting") as GameStatus,
    currentRound: (game.currentRound ?? "pre-flop") as RoundType,
    currentHighestBet: game.currentHighestBet ?? 0,
    currentPlayerTurn: game.currentPlayerTurn ?? undefined,
    lastAggressorId: game.lastAggressorId ?? undefined,
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
    deck: deck.map((c) => ({ rank: c.rank, suit: c.suit })),
    // Default to updatedAt + turnMs if turnTimeoutAt is not set
    turnTimeoutAt:
      game.turnTimeoutAt ?? new Date(game.updatedAt.getTime() + game.turnMs),
    turnMs: game.turnMs,
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

    // Skip early if no changes (when we have previous state)
    if (_previousState) {
      const gameChanged = !shallowEqualByKeys(_previousState, pureGameState, [
        "status",
        "currentRound",
        "currentHighestBet",
        "currentPlayerTurn",
        "lastAggressorId",
        "pot",
        "bigBlind",
        "smallBlind",
        "lastAction",
        "lastBetAmount",
        "turnTimeoutAt",
      ]);

      const playersChanged = hasArrayChanges(
        _previousState.players,
        pureGameState.players,
        (p) => p.id,
        (a, b) =>
          shallowEqualByKeys(a, b, [
            "seat",
            "stack",
            "currentBet",
            "hasFolded",
            "isButton",
            "hasWon",
            "showCards",
            "handRank",
            "handValue",
            "handName",
          ])
      );

      const cardsChanged = hasArrayChanges(
        _previousState.communityCards.concat(
          _previousState.players.flatMap((p) => p.holeCards)
        ) as Array<{ rank: Rank; suit: Suit }>,
        pureGameState.communityCards.concat(
          pureGameState.players.flatMap((p) => p.holeCards)
        ) as Array<{ rank: Rank; suit: Suit }>,
        (c) => `${c.rank}:${c.suit}`,
        (a, b) => a.rank === b.rank && a.suit === b.suit
      );

      if (!gameChanged && !playersChanged && !cardsChanged) {
        // Nothing to persist
        const [unchanged] = await tx
          .select()
          .from(games)
          .where(eq(games.id, pureGameState.id))
          .limit(1);
        return unchanged as Game;
      }
    }

    const [updated] = await tx
      .update(games)
      .set({
        status: pureGameState.status,
        handId: pureGameState.handId,
        currentRound: pureGameState.currentRound,
        currentHighestBet: pureGameState.currentHighestBet,
        currentPlayerTurn: pureGameState.currentPlayerTurn ?? null,
        lastAggressorId: pureGameState.lastAggressorId ?? null,
        pot: pureGameState.pot,
        bigBlind: pureGameState.bigBlind,
        smallBlind: pureGameState.smallBlind,
        lastAction: pureGameState.lastAction ?? null,
        lastBetAmount: pureGameState.lastBetAmount,
        turnTimeoutAt: pureGameState.turnTimeoutAt,
        turnMs: pureGameState.turnMs,
        updatedAt: new Date(),
      })
      .where(eq(games.id, pureGameState.id))
      .returning();

    // Update only changed players when previous state is available
    const previousPlayersById = new Map(
      (_previousState?.players ?? []).map((pp) => [pp.id, pp])
    );
    for (const p of pureGameState.players) {
      const prev = previousPlayersById.get(p.id);
      const playerChanged =
        !prev ||
        prev.seat !== p.seat ||
        prev.stack !== p.stack ||
        (prev.currentBet ?? 0) !== (p.currentBet ?? 0) ||
        (prev.hasFolded ?? false) !== (p.hasFolded ?? false) ||
        (prev.isButton ?? false) !== (p.isButton ?? false) ||
        (prev.hasWon ?? false) !== (p.hasWon ?? false) ||
        (prev.showCards ?? false) !== (p.showCards ?? false) ||
        (prev.handRank ?? null) !== (p.handRank ?? null) ||
        (prev.handValue ?? null) !== (p.handValue ?? null) ||
        (prev.handName ?? null) !== (p.handName ?? null);

      if (playerChanged) {
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
    }

    // Cards: perform a minimal diff when previous state is available; otherwise replace
    type DbCardRow = {
      gameId: string;
      playerId: string | null;
      rank: Rank;
      suit: Suit;
      handId: number;
    };

    const extractCardRows = (state: GameState): DbCardRow[] => {
      const rows: DbCardRow[] = [];
      for (const c of state.communityCards) {
        rows.push({
          gameId: state.id,
          handId: state.handId,
          playerId: null,
          rank: c.rank,
          suit: c.suit,
        });
      }
      for (const pl of state.players) {
        for (const c of pl.holeCards) {
          rows.push({
            gameId: state.id,
            handId: state.handId,
            playerId: pl.id,
            rank: c.rank,
            suit: c.suit,
          });
        }
      }
      return rows;
    };

    const nextCardRows = extractCardRows(pureGameState);
    if (_previousState) {
      // Build set of existing cards for this game and current hand directly from DB
      // to make operations idempotent in the presence of concurrent requests.
      const existingThisHand = await tx
        .select()
        .from(cardsTable)
        .where(
          and(
            eq(cardsTable.gameId, pureGameState.id),
            eq(cardsTable.handId, pureGameState.handId)
          )
        );

      const keyOf = (r: DbCardRow) =>
        `${r.playerId ?? "community"}:${r.rank}:${r.suit}`;

      const existingSet = new Set(
        existingThisHand.map((r) =>
          keyOf({
            gameId: r.gameId!,
            handId: r.handId,
            playerId: r.playerId ?? null,
            rank: r.rank,
            suit: r.suit,
          })
        )
      );

      // Always delete cards from past hands (cleanup)
      await tx
        .delete(cardsTable)
        .where(
          and(
            eq(cardsTable.gameId, pureGameState.id),
            not(eq(cardsTable.handId, pureGameState.handId))
          )
        );

      // Insert only missing cards for the current hand; never delete current-hand cards.
      const toInsert: DbCardRow[] = [];
      // Track counts to avoid inserting more than allowed per player/board in edge cases
      const playerCounts = new Map<string, number>();
      let communityCount = 0;
      for (const r of existingThisHand) {
        if (r.playerId === null) communityCount += 1;
        else
          playerCounts.set(r.playerId, (playerCounts.get(r.playerId) ?? 0) + 1);
      }

      for (const r of nextCardRows) {
        const k = keyOf(r);
        if (existingSet.has(k)) continue;

        if (r.playerId === null) {
          // Limit to max 5 community cards
          if (communityCount >= 5) continue;
          communityCount += 1;
          toInsert.push(r);
        } else {
          // Limit to max 2 hole cards per player
          const pid = r.playerId;
          const count = playerCounts.get(pid) ?? 0;
          if (count >= 2) continue;
          playerCounts.set(pid, count + 1);
          toInsert.push(r);
        }
      }

      if (toInsert.length > 0) {
        await tx.insert(cardsTable).values(toInsert);
      }

      // Reveal logic: only toggle for players whose visibility changed, and only at showdown
      if (pureGameState.currentRound === "showdown") {
        const prevShowById = new Map(
          (_previousState?.players ?? []).map((pp) => [pp.id, !!pp.showCards])
        );
        const newlyRevealIds = pureGameState.players
          .filter((p) => p.showCards && !prevShowById.get(p.id))
          .map((p) => p.id);
        const newlyHideIds = pureGameState.players
          .filter((p) => !p.showCards && prevShowById.get(p.id))
          .map((p) => p.id);

        if (newlyRevealIds.length > 0) {
          await tx
            .update(cardsTable)
            .set({ revealAtShowdown: true })
            .where(
              and(
                eq(cardsTable.gameId, pureGameState.id),
                eq(cardsTable.handId, pureGameState.handId),
                inArray(cardsTable.playerId, newlyRevealIds)
              )
            );
        }

        if (newlyHideIds.length > 0) {
          await tx
            .update(cardsTable)
            .set({ revealAtShowdown: false })
            .where(
              and(
                eq(cardsTable.gameId, pureGameState.id),
                eq(cardsTable.handId, pureGameState.handId),
                inArray(cardsTable.playerId, newlyHideIds)
              )
            );
        }
      }
    } else {
      // No previous state; fallback to replace
      await tx
        .delete(cardsTable)
        .where(eq(cardsTable.gameId, pureGameState.id));
      if (nextCardRows.length > 0) {
        await tx.insert(cardsTable).values(nextCardRows);
      }

      // Even without previous state, only set reveal flags during showdown and only for those that should be revealed
      if (pureGameState.currentRound === "showdown") {
        const toRevealIds = pureGameState.players
          .filter((p) => p.showCards)
          .map((p) => p.id);
        if (toRevealIds.length > 0) {
          await tx
            .update(cardsTable)
            .set({ revealAtShowdown: true })
            .where(
              and(
                eq(cardsTable.gameId, pureGameState.id),
                eq(cardsTable.handId, pureGameState.handId),
                inArray(cardsTable.playerId, toRevealIds)
              )
            );
        }
      }
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
    action: input.action as ActionType,
    amount: input.amount,
  };

  const validation = validateAction(previousState, pureAction);
  if (!validation.isValid) {
    throw new Error(validation.error ?? "Invalid action");
  }

  const actorSource = input.actorSource ?? input.__actorSource ?? "human";
  const botStrategy = input.botStrategy ?? input.__botStrategy ?? null;

  await db.insert(actions).values({
    gameId: input.gameId,
    playerId: input.playerId,
    handId: previousState.handId ?? 0,
    actionType: input.action,
    amount: input.amount ?? null,
    actorSource,
    botStrategy,
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
    // Set the first turn timeout and persist turnMs
    turnTimeoutAt: new Date(Date.now() + currentGameState.turnMs),
    turnMs: currentGameState.turnMs,
    // Preserve stacks, clear round-specific state, set next button and increment handId
    handId: (currentGameState.handId ?? 0) + 1,
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
          eq(playersTable.leaveAfterHand, true)
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
  // Mark player to leave after hand and fold them immediately from current hand if active
  const existing = await db
    .select()
    .from(playersTable)
    .where(
      and(eq(playersTable.gameId, gameId), eq(playersTable.userId, userId))
    )
    .limit(1);

  const player = existing[0];
  if (!player) {
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    if (!game) throw new Error("Game not found");
    return game;
  }

  await db
    .update(playersTable)
    .set({ leaveAfterHand: true, isConnected: false, lastSeen: new Date() })
    .where(eq(playersTable.id, player.id));

  // If hand is active, fold them out immediately and progress the game if needed
  const prev = await dbGameToPureGame(gameId);
  if (prev.status === "active") {
    let next = forceFoldPlayer(prev, player.id);

    // If only one player remains after fold, end game
    const remaining = next.players.filter((p) => !p.hasFolded);
    if (remaining.length === 1) {
      next = handleSinglePlayerWin(next);
    } else {
      // If it was their turn, move to the next eligible player or advance rounds as needed
      if (prev.currentPlayerTurn === player.id) {
        const activePlayers = remaining;
        const allBetsEqual = activePlayers.every(
          (p) => p.currentBet === next.currentHighestBet || p.stack === 0
        );
        if (allBetsEqual) {
          if (next.currentRound === "river") {
            next = handleShowdown(next);
          } else {
            next = advanceToNextRound(next);
          }
        } else {
          next = advanceToNextPlayer(next);
        }
      }
    }

    return await persistPureGameState(next, prev);
  }

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!game) throw new Error("Game not found");
  return game as Game;
}

export async function timeoutPlayerPure(gameId: string, playerId: string) {
  const previousState = await dbGameToPureGame(gameId);
  const timeoutResult = timeoutPlayer(previousState, playerId);
  if (timeoutResult.isValid) {
    await persistPureGameState(timeoutResult.newGameState, previousState);
  }

  return timeoutResult;
}
