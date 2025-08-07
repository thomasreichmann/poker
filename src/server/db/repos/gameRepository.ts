import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { GameState, Card as PureCard, Player as PurePlayer } from "~/lib/poker/pureEngine";
import type { AuthenticatedTRPCContext as Context } from "~/server/api/trpc";

import { cards } from "~/server/db/schema/cards";
import { games, type Game } from "~/server/db/schema/games";
import { players } from "~/server/db/schema/players";

function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(
    (a as Record<string, unknown>)[key], 
    (b as Record<string, unknown>)[key]
  ));
}

function getChangedPlayers(before: PurePlayer[], after: PurePlayer[]): PurePlayer[] {
  return after.filter(afterPlayer => {
    const beforePlayer = before.find(p => p.id === afterPlayer.id);
    return !beforePlayer || !deepEqual(beforePlayer, afterPlayer);
  });
}

function cardsChanged(beforeState: GameState | undefined, afterState: GameState): boolean {
  if (!beforeState) return true;
  
  if (!deepEqual(beforeState.communityCards, afterState.communityCards)) return true;
  
  return afterState.players.some(afterPlayer => {
    const beforePlayer = beforeState.players.find(p => p.id === afterPlayer.id);
    return !beforePlayer || !deepEqual(beforePlayer.holeCards, afterPlayer.holeCards);
  });
}

export class GameRepository {
  constructor(private ctx: Context) {}

  async getGameWithPlayers(gameId: string): Promise<GameState> {
    const gameWithData = await this.ctx.db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        players: {
          with: {
            cards: true,
          },
        },
        cards: {
          where: isNull(cards.playerId),
        },
      },
    });

    if (!gameWithData) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
    }

    const purePlayers: PurePlayer[] = gameWithData.players.map(dbPlayer => ({
      id: dbPlayer.id,
      seat: dbPlayer.seat,
      stack: dbPlayer.stack,
      currentBet: dbPlayer.currentBet ?? 0,
      hasFolded: dbPlayer.hasFolded ?? false,
      isButton: dbPlayer.isButton ?? false,
      hasWon: dbPlayer.hasWon ?? false,
      showCards: dbPlayer.showCards ?? false,
      handRank: dbPlayer.handRank ?? undefined,
      handValue: dbPlayer.handValue ?? undefined,
      handName: dbPlayer.handName ?? undefined,
      holeCards: dbPlayer.cards?.map(card => ({
        rank: card.rank,
        suit: card.suit,
      })) ?? [],
    }));

    const communityCards: PureCard[] = gameWithData.cards?.map(card => ({
      rank: card.rank,
      suit: card.suit,
    })) ?? [];

    return {
      id: gameWithData.id,
      status: gameWithData.status ?? "waiting",
      currentRound: gameWithData.currentRound ?? "pre-flop",
      currentHighestBet: gameWithData.currentHighestBet,
      currentPlayerTurn: gameWithData.currentPlayerTurn ?? undefined,
      pot: gameWithData.pot,
      bigBlind: gameWithData.bigBlind,
      smallBlind: gameWithData.smallBlind,
      lastAction: gameWithData.lastAction === "timeout" ? undefined : (gameWithData.lastAction ?? undefined),
      lastBetAmount: gameWithData.lastBetAmount ?? 0,
      players: purePlayers,
      communityCards,
      deck: [],
    };
  }

  async persistGameState(
    pureGameState: GameState, 
    previousState?: GameState
  ): Promise<Game> {
    return this.ctx.db.transaction(async (tx) => {
      const [updatedGame] = await tx
        .update(games)
        .set({
          status: pureGameState.status,
          currentRound: pureGameState.currentRound,
          currentHighestBet: pureGameState.currentHighestBet,
          currentPlayerTurn: pureGameState.currentPlayerTurn,
          pot: pureGameState.pot,
          lastAction: pureGameState.lastAction,
          lastBetAmount: pureGameState.lastBetAmount,
          updatedAt: new Date(),
        })
        .where(eq(games.id, pureGameState.id))
        .returning();

      if (!updatedGame) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update game" });
      }

      if (previousState) {
        const changedPlayers = getChangedPlayers(previousState.players, pureGameState.players);
        for (const purePlayer of changedPlayers) {
          await tx
            .update(players)
            .set({
              stack: purePlayer.stack,
              currentBet: purePlayer.currentBet || null,
              hasFolded: purePlayer.hasFolded,
              isButton: purePlayer.isButton,
              hasWon: purePlayer.hasWon,
              showCards: purePlayer.showCards,
              handRank: purePlayer.handRank,
              handValue: purePlayer.handValue,
              handName: purePlayer.handName,
            })
            .where(eq(players.id, purePlayer.id));
        }
      } else {
        for (const purePlayer of pureGameState.players) {
          await tx
            .update(players)
            .set({
              stack: purePlayer.stack,
              currentBet: purePlayer.currentBet || null,
              hasFolded: purePlayer.hasFolded,
              isButton: purePlayer.isButton,
              hasWon: purePlayer.hasWon,
              showCards: purePlayer.showCards,
              handRank: purePlayer.handRank,
              handValue: purePlayer.handValue,
              handName: purePlayer.handName,
            })
            .where(eq(players.id, purePlayer.id));
        }
      }

      if (cardsChanged(previousState, pureGameState)) {
        await tx.delete(cards).where(and(eq(cards.gameId, pureGameState.id), isNull(cards.playerId)));
        
        if (pureGameState.communityCards.length > 0) {
          await tx.insert(cards).values(
            pureGameState.communityCards.map((card: PureCard) => ({
              gameId: pureGameState.id,
              playerId: null,
              rank: card.rank,
              suit: card.suit,
            }))
          );
        }

        for (const purePlayer of pureGameState.players) {
          await tx.delete(cards).where(and(eq(cards.gameId, pureGameState.id), eq(cards.playerId, purePlayer.id)));
          
          if (purePlayer.holeCards.length > 0) {
            await tx.insert(cards).values(
              purePlayer.holeCards.map((card: PureCard) => ({
                gameId: pureGameState.id,
                playerId: purePlayer.id,
                rank: card.rank,
                suit: card.suit,
              }))
            );
          }
        }
      }

      return updatedGame;
    });
  }

  async deleteAllCards(gameId: string): Promise<void> {
    await this.ctx.db.delete(cards).where(eq(cards.gameId, gameId));
  }
}