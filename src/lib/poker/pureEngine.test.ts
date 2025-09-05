import { beforeEach, describe, expect, test } from "vitest";
import {
  addPlayerToGame,
  createInitialGameState,
  distributeWinnings,
  executeGameAction,
  findWinners,
  getActivePlayers,
  processAction,
  startNewGame,
  validateAction,
} from "./pureEngine";
import type { GameAction, GameState, Player } from "./types";

describe("Pure Poker Engine", () => {
  describe("Game State Creation", () => {
    test("creates initial game state", () => {
      const gameState = createInitialGameState("test-game");

      expect(gameState.id).toBe("test-game");
      expect(gameState.status).toBe("waiting");
      expect(gameState.currentRound).toBe("pre-flop");
      expect(gameState.pot).toBe(0);
      expect(gameState.players).toHaveLength(0);
      expect(gameState.communityCards).toHaveLength(0);
      expect(gameState.deck).toHaveLength(52);
    });

    test("adds player to game", () => {
      let gameState = createInitialGameState("test-game");
      gameState = addPlayerToGame(gameState, "player1", 1000);

      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0]?.id).toBe("player1");
      expect(gameState.players[0]?.stack).toBe(1000);
      expect(gameState.players[0]?.seat).toBe(0);
    });

    test("starts game when 2 players join", () => {
      let gameState = createInitialGameState("test-game");
      gameState = addPlayerToGame(gameState, "player1", 1000);
      gameState = addPlayerToGame(gameState, "player2", 1000);

      expect(gameState.status).toBe("active");
      expect(gameState.currentPlayerTurn).toBeDefined();
      expect(gameState.players[0]?.holeCards).toHaveLength(2);
      expect(gameState.players[1]?.holeCards).toHaveLength(2);
    });
  });

  describe("Player Management", () => {
    test("gets active players", () => {
      let gameState = createInitialGameState("test-game");
      gameState = addPlayerToGame(gameState, "player1", 1000);
      gameState = addPlayerToGame(gameState, "player2", 1000);

      // Fold one player
      gameState.players[0]!.hasFolded = true;

      const activePlayers = getActivePlayers(gameState);
      expect(activePlayers).toHaveLength(1);
      expect(activePlayers[0]?.id).toBe("player2");
    });
  });

  describe("Action Validation", () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = createInitialGameState("test-game");
      gameState = addPlayerToGame(gameState, "player1", 1000);
      gameState = addPlayerToGame(gameState, "player2", 1000);
    });

    test("validates valid check", () => {
      // For check to be valid, we need no current bet (post-flop scenario)
      const postFlopGameState = { ...gameState };
      postFlopGameState.currentRound = "flop";
      postFlopGameState.currentHighestBet = 0;
      postFlopGameState.communityCards = [
        { rank: "A", suit: "hearts" },
        { rank: "K", suit: "spades" },
        { rank: "Q", suit: "diamonds" },
      ];

      const action: GameAction = {
        playerId: postFlopGameState.currentPlayerTurn!,
        action: "check",
      };

      const validation = validateAction(postFlopGameState, action);
      expect(validation.isValid).toBe(true);
    });

    test("validates valid bet", () => {
      // Make a post-flop scenario with no existing bet
      const postFlop = { ...gameState } as GameState;
      postFlop.currentRound = "flop";
      postFlop.currentHighestBet = 0;
      postFlop.communityCards = [
        { rank: "A", suit: "hearts" },
        { rank: "K", suit: "spades" },
        { rank: "Q", suit: "diamonds" },
      ];

      const action: GameAction = {
        playerId: postFlop.currentPlayerTurn!,
        action: "bet",
        amount: 50,
      };

      const validation = validateAction(postFlop, action);
      expect(validation.isValid).toBe(true);
    });

    test("rejects bet exceeding stack", () => {
      const action: GameAction = {
        playerId: gameState.currentPlayerTurn!,
        action: "bet",
        amount: 2000,
      };

      const validation = validateAction(gameState, action);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("exceeds player's stack");
    });

    test("rejects check when there's a bet", () => {
      gameState.currentHighestBet = 50;

      const action: GameAction = {
        playerId: gameState.currentPlayerTurn!,
        action: "check",
      };

      const validation = validateAction(gameState, action);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("bet to call");
    });

    test("rejects action from wrong player", () => {
      const otherPlayer = gameState.players.find(
        (p) => p.id !== gameState.currentPlayerTurn
      );
      const otherPlayerId = otherPlayer!.id;

      const action: GameAction = {
        playerId: otherPlayerId,
        action: "check",
      };

      const validation = validateAction(gameState, action);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("Not player's turn");
    });
  });

  describe("Action Processing", () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = createInitialGameState("test-game");
      gameState = addPlayerToGame(gameState, "player1", 1000);
      gameState = addPlayerToGame(gameState, "player2", 1000);
    });

    test("processes bet correctly", () => {
      // Switch to a post-flop state with no existing bet
      const postFlop = { ...gameState } as GameState;
      postFlop.currentRound = "flop";
      postFlop.currentHighestBet = 0;
      postFlop.communityCards = [
        { rank: "A", suit: "hearts" },
        { rank: "K", suit: "spades" },
        { rank: "Q", suit: "diamonds" },
      ];

      const currentPlayer = postFlop.players.find(
        (p) => p.id === postFlop.currentPlayerTurn
      )!;
      const initialStack = currentPlayer.stack;
      const initialCurrentBet = currentPlayer.currentBet;

      const action: GameAction = {
        playerId: postFlop.currentPlayerTurn!,
        action: "bet",
        amount: 50,
      };

      const result = processAction(postFlop, action);

      expect(result.success).toBe(true);
      expect(result.newGameState.pot).toBe(postFlop.pot + 50);
      expect(result.newGameState.currentHighestBet).toBe(
        initialCurrentBet + 50
      );

      const updatedPlayer = result.newGameState.players.find(
        (p) => p.id === currentPlayer.id
      )!;
      expect(updatedPlayer.stack).toBe(initialStack - 50);
      expect(updatedPlayer.currentBet).toBe(initialCurrentBet + 50);
    });

    test("processes fold correctly", () => {
      const action: GameAction = {
        playerId: gameState.currentPlayerTurn!,
        action: "fold",
      };

      const result = processAction(gameState, action);

      expect(result.success).toBe(true);

      const foldedPlayer = result.newGameState.players.find(
        (p) => p.id === gameState.currentPlayerTurn!
      )!;
      expect(foldedPlayer.hasFolded).toBe(true);
    });

    test("processes call correctly", () => {
      // With automatic blinds: pot=30 (10+20), currentHighestBet=20 (big blind)
      const currentPlayer = gameState.players.find(
        (p) => p.id === gameState.currentPlayerTurn
      )!;
      const initialStack = currentPlayer.stack;
      const callAmount = gameState.currentHighestBet - currentPlayer.currentBet;

      const action: GameAction = {
        playerId: gameState.currentPlayerTurn!,
        action: "call",
      };

      const result = processAction(gameState, action);

      expect(result.success).toBe(true);
      expect(result.newGameState.pot).toBe(gameState.pot + callAmount); // Initial pot + call amount

      const updatedPlayer = result.newGameState.players.find(
        (p) => p.id === currentPlayer.id
      )!;
      expect(updatedPlayer.stack).toBe(initialStack - callAmount);
      expect(updatedPlayer.currentBet).toBe(gameState.currentHighestBet);
    });
  });

  describe("Game Progression", () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = createInitialGameState("test-game");
      gameState = addPlayerToGame(gameState, "player1", 1000);
      gameState = addPlayerToGame(gameState, "player2", 1000);
    });

    test("advances to next round after all players check", () => {
      // Start in pre-flop with blinds already posted
      expect(gameState.currentRound).toBe("pre-flop");
      expect(gameState.communityCards).toHaveLength(0);
      expect(gameState.currentHighestBet).toBe(20); // Big blind (default 20)

      // UTG calls the big blind
      let result = executeGameAction(gameState, {
        playerId: gameState.currentPlayerTurn!,
        action: "call",
      });

      // Big blind has option to check or raise
      result = executeGameAction(result, {
        playerId: result.currentPlayerTurn!,
        action: "check",
      });

      // Should advance to flop
      expect(result.currentRound).toBe("flop");
      expect(result.communityCards).toHaveLength(3);
      expect(result.currentHighestBet).toBe(0); // Reset for new round

      // Now test flop checking - both players check
      result = executeGameAction(result, {
        playerId: result.currentPlayerTurn!,
        action: "check",
      });

      result = executeGameAction(result, {
        playerId: result.currentPlayerTurn!,
        action: "check",
      });

      // Should advance to turn
      expect(result.currentRound).toBe("turn");
      expect(result.communityCards).toHaveLength(4);
    });

    test("ends game when one player folds", () => {
      const result = executeGameAction(gameState, {
        playerId: gameState.currentPlayerTurn!,
        action: "fold",
      });

      expect(result.status).toBe("completed");
      expect(getActivePlayers(result)).toHaveLength(1);
    });

    test("round advances after raise and all calls when action returns to aggressor", () => {
      // Start a 3-player game by constructing players first, then starting
      let gs = createInitialGameState("raise-call-test");
      gs = {
        ...gs,
        players: [
          { id: "P1", seat: 0, stack: 1000, currentBet: 0, hasFolded: false, isButton: false, hasWon: false, showCards: false, holeCards: [] },
          { id: "P2", seat: 1, stack: 1000, currentBet: 0, hasFolded: false, isButton: false, hasWon: false, showCards: false, holeCards: [] },
          { id: "P3", seat: 2, stack: 1000, currentBet: 0, hasFolded: false, isButton: false, hasWon: false, showCards: false, holeCards: [] },
        ],
      } as GameState;
      gs = startNewGame(gs);

      // Preflop initial state: blinds posted automatically, UTG first to act
      // UTG raises the minimum (to 2x currentHighestBet)
      const utg = gs.currentPlayerTurn!;
      const utgPlayer = gs.players.find((p) => p.id === utg)!;
      const minTargetTotal = Math.max(gs.bigBlind, gs.currentHighestBet * 2);
      const utgRaiseDelta = Math.max(1, minTargetTotal - utgPlayer.currentBet);
      gs = executeGameAction(gs, { playerId: utg, action: "raise", amount: utgRaiseDelta });

      // Next player calls
      const caller1 = gs.currentPlayerTurn!;
      gs = executeGameAction(gs, { playerId: caller1, action: "call" });

      // Next player calls
      const caller2 = gs.currentPlayerTurn!;
      gs = executeGameAction(gs, { playerId: caller2, action: "call" });

      // After the last call, action should return to the aggressor, which should complete the round
      // Verify we advanced to flop
      expect(gs.currentRound).toBe("flop");
      expect(gs.communityCards).toHaveLength(3);
      expect(gs.currentHighestBet).toBe(0);
    });
  });

  describe("Winner Determination", () => {
    test("finds single winner", () => {
      const gameState = createInitialGameState("test-game");

      // Create players with known hands
      const player1: Player = {
        id: "player1",
        seat: 0,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [
          { rank: "A" as const, suit: "spades" as const },
          { rank: "K" as const, suit: "spades" as const },
        ],
      };

      const player2: Player = {
        id: "player2",
        seat: 1,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [
          { rank: "2" as const, suit: "hearts" as const },
          { rank: "3" as const, suit: "clubs" as const },
        ],
      };

      const gameStateWithPlayers = {
        ...gameState,
        players: [player1, player2],
        communityCards: [
          { rank: "Q" as const, suit: "spades" as const },
          { rank: "J" as const, suit: "spades" as const },
          { rank: "10" as const, suit: "spades" as const },
          { rank: "4" as const, suit: "hearts" as const },
          { rank: "5" as const, suit: "diamonds" as const },
        ],
      };

      const { winners } = findWinners(gameStateWithPlayers);

      expect(winners).toHaveLength(1);
      expect(winners[0]?.id).toBe("player1"); // Royal flush beats high card
    });

    test("distributes winnings correctly", () => {
      const gameState = createInitialGameState("test-game");
      gameState.pot = 200;

      const winner: Player = {
        id: "player1",
        seat: 0,
        stack: 800,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [],
      };

      gameState.players = [winner];

      const result = distributeWinnings(gameState, [winner]);

      expect(result.pot).toBe(0);
      expect(result.status).toBe("completed");

      const updatedWinner = result.players.find((p) => p.id === "player1")!;
      expect(updatedWinner.stack).toBe(1000);
      expect(updatedWinner.hasWon).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("handles all-in situations", () => {
      let gameState = createInitialGameState("test-game");
      gameState = addPlayerToGame(gameState, "player1", 100);
      gameState = addPlayerToGame(gameState, "player2", 1000);

      const currentPlayerId = gameState.currentPlayerTurn!;
      const currentPlayer = gameState.players.find(
        (p) => p.id === currentPlayerId
      )!;
      const currentStack = currentPlayer.stack; // Stack after potential blind posting
      const initialCurrentBet = currentPlayer.currentBet; // Any existing bet (like blinds)

      // If there's already a bet (blinds), use raise; otherwise use bet
      const actionType = gameState.currentHighestBet > 0 ? "raise" : "bet";
      const result = executeGameAction(gameState, {
        playerId: currentPlayerId,
        action: actionType,
        amount: currentStack, // Use their current stack after blind posting
      });

      const allInPlayer = result.players.find((p) => p.id === currentPlayerId)!;
      expect(allInPlayer.stack).toBe(0);
      expect(allInPlayer.currentBet).toBe(initialCurrentBet + currentStack); // Previous bet + all-in amount
    });

    test("handles tie situations", () => {
      const gameState = createInitialGameState("test-game");

      // Create two players with identical hands
      const player1: Player = {
        id: "player1",
        seat: 0,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [
          { rank: "A", suit: "spades" },
          { rank: "K", suit: "hearts" },
        ],
      };

      const player2: Player = {
        id: "player2",
        seat: 1,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [
          { rank: "A" as const, suit: "diamonds" as const },
          { rank: "K" as const, suit: "clubs" as const },
        ],
      };

      const gameStateWithPlayers = {
        ...gameState,
        pot: 200,
        players: [player1, player2],
        communityCards: [
          { rank: "Q" as const, suit: "spades" as const },
          { rank: "J" as const, suit: "hearts" as const },
          { rank: "10" as const, suit: "diamonds" as const },
          { rank: "4" as const, suit: "hearts" as const },
          { rank: "5" as const, suit: "diamonds" as const },
        ],
      };

      const { winners } = findWinners(gameStateWithPlayers);
      expect(winners).toHaveLength(2); // Both have the same straight

      const result = distributeWinnings(gameStateWithPlayers, winners);

      // Each player should get 100 chips
      expect(result.players[0]?.stack).toBe(1100);
      expect(result.players[1]?.stack).toBe(1100);
    });
  });

  describe("Full Game Integration", () => {
    test("4-player full game progresses through all rounds to showdown", () => {
      // Create initial game state
      let gameState = createInitialGameState("full-game-test", 50, 25);

      // Add 4 players without auto-starting the game
      const player1: Player = {
        id: "player1",
        seat: 0,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [],
      };
      const player2: Player = {
        id: "player2",
        seat: 1,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [],
      };
      const player3: Player = {
        id: "player3",
        seat: 2,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [],
      };
      const player4: Player = {
        id: "player4",
        seat: 3,
        stack: 1000,
        currentBet: 0,
        hasFolded: false,
        isButton: false,
        hasWon: false,
        showCards: false,
        holeCards: [],
      };

      gameState = {
        ...gameState,
        players: [player1, player2, player3, player4],
      };

      // Start the game once with all 4 players
      gameState = startNewGame(gameState);

      // Verify initial game setup
      expect(gameState.status).toBe("active");
      expect(gameState.players).toHaveLength(4);
      expect(gameState.currentRound).toBe("pre-flop");
      expect(getActivePlayers(gameState)).toHaveLength(4);

      // All players should have hole cards
      gameState.players.forEach((player) => {
        expect(player.holeCards).toHaveLength(2);
      });

      // Blinds should be posted automatically
      expect(gameState.pot).toBe(75); // Small blind (25) + Big blind (50)
      expect(gameState.currentHighestBet).toBe(50);

      // Current player should be UTG (Under the Gun) - first to act pre-flop
      let currentPlayer = gameState.currentPlayerTurn;
      expect(currentPlayer).toBeDefined();

      // Verify that blinds are correctly posted
      const smallBlindPlayer = gameState.players.find(
        (p) => p.currentBet === 25
      );
      const bigBlindPlayer = gameState.players.find((p) => p.currentBet === 50);
      expect(smallBlindPlayer).toBeDefined();
      expect(bigBlindPlayer).toBeDefined();

      // They should be different players
      expect(smallBlindPlayer!.id).not.toBe(bigBlindPlayer!.id);

      // PRE-FLOP: Complete betting round
      // UTG (first to act) calls
      currentPlayer = gameState.currentPlayerTurn;
      let action: GameAction = { playerId: currentPlayer!, action: "call" };
      gameState = executeGameAction(gameState, action);

      // Next player calls
      currentPlayer = gameState.currentPlayerTurn;
      action = { playerId: currentPlayer!, action: "call" };
      gameState = executeGameAction(gameState, action);

      // Small blind calls (needs to add 25 more to match big blind)
      currentPlayer = gameState.currentPlayerTurn;
      action = { playerId: currentPlayer!, action: "call" };
      gameState = executeGameAction(gameState, action);

      // Big blind has the option to check or raise (no one raised)
      currentPlayer = gameState.currentPlayerTurn;
      action = { playerId: currentPlayer!, action: "check" };
      gameState = executeGameAction(gameState, action);

      // Should now properly advance to FLOP (not skip rounds)
      expect(gameState.currentRound).toBe("flop");
      expect(gameState.communityCards).toHaveLength(3);
      expect(gameState.currentHighestBet).toBe(0);
      expect(gameState.pot).toBe(200); // 4 players * 50
      expect(gameState.status).toBe("active");

      // FLOP: All players check
      for (let i = 0; i < 4; i++) {
        if (gameState.status !== "active") {
          // Game has completed early, break the loop
          break;
        }
        currentPlayer = gameState.currentPlayerTurn;
        action = { playerId: currentPlayer!, action: "check" };
        gameState = executeGameAction(gameState, action);
      }

      // Should advance to TURN (if game is still active)
      if (gameState.status === "active") {
        expect(gameState.currentRound).toBe("turn");
        expect(gameState.communityCards).toHaveLength(4);
        expect(gameState.currentHighestBet).toBe(0);
        expect(gameState.pot).toBe(200);
      }

      // TURN: All players check
      for (let i = 0; i < 4; i++) {
        if (gameState.status !== "active") {
          break;
        }
        currentPlayer = gameState.currentPlayerTurn;
        action = { playerId: currentPlayer!, action: "check" };
        gameState = executeGameAction(gameState, action);
      }

      // Should advance to RIVER (if game is still active)
      if (gameState.status === "active") {
        expect(gameState.currentRound).toBe("river");
        expect(gameState.communityCards).toHaveLength(5);
        expect(gameState.currentHighestBet).toBe(0);
        expect(gameState.pot).toBe(200);

        // RIVER: All players check
        for (let i = 0; i < 4; i++) {
          if (gameState.status !== "active") {
            break;
          }
          currentPlayer = gameState.currentPlayerTurn;
          action = { playerId: currentPlayer!, action: "check" };
          gameState = executeGameAction(gameState, action);
        }
      }

      // Should be in showdown
      expect(gameState.status).toBe("completed");
      expect(gameState.currentRound).toBe("showdown");

      // Verify final state
      const activePlayers = getActivePlayers(gameState);
      expect(activePlayers).toHaveLength(4);

      // Winners should be determined and winnings distributed
      const winners = activePlayers.filter((p) => p.hasWon);
      expect(winners.length).toBeGreaterThan(0);

      // Total stack should be conserved
      const totalStacksAfter = gameState.players.reduce(
        (sum, p) => sum + p.stack,
        0
      );
      expect(totalStacksAfter).toBe(4000); // 4 players * 1000 initial stack

      // Pot should be distributed
      expect(gameState.pot).toBe(0);

      // Verify the game actually progressed (different stacks)
      const initialStack = 1000;
      const hasChangedStacks = gameState.players.some(
        (p) => p.stack !== initialStack
      );
      expect(hasChangedStacks).toBe(true);
    });
  });
});
