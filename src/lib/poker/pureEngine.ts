// Pure TypeScript Poker Game Engine
// This module handles all game transitions, validations, and winner calculations
// It has no dependencies on databases, sockets, or React - only pure functions

import {
  evaluateHand,
  generateDeck,
  getAvailableCards,
  getRandomCards,
} from "./cards";
import type {
  ActionResult,
  Card,
  GameAction,
  GameState,
  Player,
  RoundType,
  WinnerResult,
} from "./types";

// Re-export types for external use
export type {
  ActionResult,
  Card,
  GameAction,
  GameState,
  Player,
  WinnerResult,
} from "./types";

// Round progression mapping
const ROUND_PROGRESSION: Record<RoundType, RoundType | null> = {
  "pre-flop": "flop",
  flop: "turn",
  turn: "river",
  river: "showdown",
  showdown: null,
};

// ============================================================================
// GAME STATE UTILITIES
// ============================================================================

export function createInitialGameState(
  gameId: string,
  bigBlind = 20,
  smallBlind = 10
): GameState {
  return {
    id: gameId,
    status: "waiting",
    currentRound: "pre-flop",
    currentHighestBet: 0,
    currentPlayerTurn: undefined,
    pot: 0,
    bigBlind,
    smallBlind,
    lastAction: undefined,
    lastBetAmount: 0,
    players: [],
    communityCards: [],
    deck: generateDeck(),
    handId: 0,
  };
}

export function addPlayerToGame(
  gameState: GameState,
  playerId: string,
  stack: number
): GameState {
  const newPlayer: Player = {
    id: playerId,
    seat: gameState.players.length,
    stack,
    currentBet: 0,
    hasFolded: gameState.status === "active" ? true : false,
    isButton: false,
    hasWon: false,
    showCards: false,
    holeCards: [],
  };

  const newPlayers = [...gameState.players, newPlayer];

  // Start the game if we now have 2 or more players
  if (newPlayers.length >= 2 && gameState.status === "waiting") {
    return startNewGame({ ...gameState, players: newPlayers });
  }

  return {
    ...gameState,
    players: newPlayers,
  };
}

export function startNewGame(gameState: GameState): GameState {
  if (gameState.players.length < 2) {
    throw new Error("Need at least 2 players to start a game");
  }

  // Reset game state
  const resetPlayers = gameState.players.map((player) => ({
    ...player,
    currentBet: 0,
    hasFolded: false,
    hasWon: false,
    showCards: false,
    handRank: undefined,
    handValue: undefined,
    handName: undefined,
    holeCards: [],
  }));

  // Assign button if not already assigned
  if (!resetPlayers.some((p) => p.isButton)) {
    resetPlayers[0]!.isButton = true;
  }

  const newGameState: GameState = {
    ...gameState,
    status: "active",
    currentRound: "pre-flop",
    currentHighestBet: 0,
    pot: 0,
    lastAction: undefined,
    lastBetAmount: 0,
    players: resetPlayers,
    communityCards: [],
    deck: generateDeck(),
  };

  // Deal hole cards, post blinds automatically, and set first player to act (UTG)
  let gameWithCards = dealCards(newGameState);
  gameWithCards = postBlinds(gameWithCards);
  return setFirstPlayerToAct(gameWithCards);
}

// ============================================================================
// PLAYER UTILITIES
// ============================================================================

export function getActivePlayers(gameState: GameState): Player[] {
  return gameState.players.filter((player) => !player.hasFolded);
}

export function getPlayerById(
  gameState: GameState,
  playerId: string
): Player | undefined {
  return gameState.players.find((player) => player.id === playerId);
}

export function updatePlayer(
  gameState: GameState,
  playerId: string,
  updates: Partial<Player>
): GameState {
  return {
    ...gameState,
    players: gameState.players.map((player) =>
      player.id === playerId ? { ...player, ...updates } : player
    ),
  };
}

// Helper function to set the first player to act based on round
export function setFirstPlayerToAct(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);

  if (activePlayers.length === 0) {
    throw new Error("No active players found");
  }

  const buttonIndexAll = gameState.players.findIndex((p) => p.isButton);
  if (buttonIndexAll === -1) {
    throw new Error("No button player found");
  }

  const findNthEligibleAfter = (startIndex: number, n: number): Player => {
    const total = gameState.players.length;
    let found = 0;
    for (let offset = 1; offset <= total * 2; offset++) {
      const idx = (startIndex + offset) % total;
      const candidate = gameState.players[idx]!;
      if (!candidate.hasFolded && candidate.stack > 0) {
        found++;
        if (found === n) return candidate;
      }
    }
    // Fallback to first active if something goes wrong
    const firstEligible = gameState.players.find(
      (p) => !p.hasFolded && p.stack > 0
    );
    return firstEligible ?? activePlayers[0]!;
  };

  let firstToAct: Player;
  if (gameState.currentRound === "pre-flop") {
    if (activePlayers.length === 2) {
      // Heads-up preflop: button (SB) acts first
      const buttonPlayerAll = gameState.players[buttonIndexAll]!;
      firstToAct = buttonPlayerAll.hasFolded || buttonPlayerAll.stack === 0
        ? findNthEligibleAfter(buttonIndexAll, 1)
        : buttonPlayerAll;
    } else {
      // Multi-way preflop: UTG is first eligible player after big blind (third after button)
      firstToAct = findNthEligibleAfter(buttonIndexAll, 3);
    }
  } else {
    // Post-flop: first eligible player to the left of the button
    firstToAct = findNthEligibleAfter(buttonIndexAll, 1);
  }

  return {
    ...gameState,
    currentPlayerTurn: firstToAct.id,
  };
}

export function setNextPlayer(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);

  if (activePlayers.length === 0) {
    throw new Error("No active players found");
  }

  // If no current player, set first player to act
  if (!gameState.currentPlayerTurn) {
    return setFirstPlayerToAct(gameState);
  }

  // Determine next eligible player by scanning the full seating order
  const allPlayers = gameState.players;
  const currentIndexInAll = allPlayers.findIndex(
    (p) => p.id === gameState.currentPlayerTurn
  );

  if (currentIndexInAll === -1) {
    // Fallback: if current player cannot be found, pick first to act for the round
    return setFirstPlayerToAct(gameState);
  }

  const playerCount = allPlayers.length;
  for (let offset = 1; offset <= playerCount; offset++) {
    const nextIndex = (currentIndexInAll + offset) % playerCount;
    const candidate = allPlayers[nextIndex]!;
    if (!candidate.hasFolded && candidate.stack > 0) {
      return { ...gameState, currentPlayerTurn: candidate.id };
    }
  }

  // If somehow no candidate found (all folded), return first to act
  return setFirstPlayerToAct(gameState);
}

// ============================================================================
// BLIND POSTING
// ============================================================================

export function postBlinds(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);

  if (activePlayers.length < 2) {
    throw new Error("Need at least 2 players to post blinds");
  }

  const buttonPlayer = activePlayers.find((p) => p.isButton);
  if (!buttonPlayer) {
    throw new Error("No button player found");
  }

  const buttonIndex = activePlayers.findIndex((p) => p.id === buttonPlayer.id);

  let smallBlindIndex: number;
  let bigBlindIndex: number;

  if (activePlayers.length === 2) {
    // Heads-up: Button is small blind
    smallBlindIndex = buttonIndex;
    bigBlindIndex = (buttonIndex + 1) % activePlayers.length;
  } else {
    // Multi-way: Small blind is left of button, big blind is left of small blind
    smallBlindIndex = (buttonIndex + 1) % activePlayers.length;
    bigBlindIndex = (buttonIndex + 2) % activePlayers.length;
  }

  const smallBlindPlayer = activePlayers[smallBlindIndex]!;
  const bigBlindPlayer = activePlayers[bigBlindIndex]!;

  // Deduct blinds from stacks and add to pot
  const smallBlindAmount = Math.min(
    gameState.smallBlind,
    smallBlindPlayer.stack
  );
  const bigBlindAmount = Math.min(gameState.bigBlind, bigBlindPlayer.stack);

  let newGameState = updatePlayer(gameState, smallBlindPlayer.id, {
    currentBet: smallBlindAmount,
    stack: smallBlindPlayer.stack - smallBlindAmount,
  });

  newGameState = updatePlayer(newGameState, bigBlindPlayer.id, {
    currentBet: bigBlindAmount,
    stack: bigBlindPlayer.stack - bigBlindAmount,
  });

  return {
    ...newGameState,
    pot: smallBlindAmount + bigBlindAmount,
    currentHighestBet: bigBlindAmount,
  };
}

// ============================================================================
// CARD DEALING
// ============================================================================

export function dealCards(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);

  if (activePlayers.length === 0) {
    throw new Error("No active players to deal cards to");
  }

  // Get already dealt cards
  const dealtCards: Card[] = [
    ...gameState.communityCards,
    ...activePlayers.flatMap((player) => player.holeCards),
  ];

  // Get available cards
  const availableCards = getAvailableCards(gameState.deck, dealtCards);

  let newGameState = { ...gameState };

  switch (gameState.currentRound) {
    case "pre-flop":
      // Deal 2 hole cards to each active player
      activePlayers.forEach((player) => {
        const holeCards = getRandomCards(availableCards, 2);
        newGameState = updatePlayer(newGameState, player.id, { holeCards });
        // Remove dealt cards from available pool
        holeCards.forEach((card) => {
          const index = availableCards.findIndex(
            (c) => c.rank === card.rank && c.suit === card.suit
          );
          if (index > -1) availableCards.splice(index, 1);
        });
      });
      break;

    case "flop":
      // Deal 3 community cards
      newGameState.communityCards = [
        ...gameState.communityCards,
        ...getRandomCards(availableCards, 3),
      ];
      break;

    case "turn":
    case "river":
      // Deal 1 community card
      newGameState.communityCards = [
        ...gameState.communityCards,
        ...getRandomCards(availableCards, 1),
      ];
      break;

    default:
      throw new Error(`Cannot deal cards for round: ${gameState.currentRound}`);
  }

  return newGameState;
}

// ============================================================================
// ACTION VALIDATION
// ============================================================================

export function validateAction(
  gameState: GameState,
  action: GameAction
): { isValid: boolean; error?: string } {
  const player = getPlayerById(gameState, action.playerId);

  if (!player) {
    return { isValid: false, error: "Player not found" };
  }

  if (player.hasFolded) {
    return { isValid: false, error: "Player has already folded" };
  }

  if (gameState.currentPlayerTurn !== action.playerId) {
    return { isValid: false, error: "Not player's turn" };
  }

  if (gameState.status !== "active") {
    return { isValid: false, error: "Game is not active" };
  }

  switch (action.action) {
    case "bet":
    case "raise":
      return validateBetOrRaise(gameState, player, action);
    case "call":
      return validateCall(gameState, player);
    case "check":
      return validateCheck(gameState, player);
    case "fold":
      return { isValid: true }; // Fold is always valid
    default:
      return { isValid: false, error: "Invalid action type" };
  }
}

function validateBetOrRaise(
  gameState: GameState,
  player: Player,
  action: GameAction
): { isValid: boolean; error?: string } {
  if (!action.amount || action.amount <= 0) {
    return { isValid: false, error: "Bet amount must be positive" };
  }

  if (action.amount > player.stack) {
    return { isValid: false, error: "Bet amount exceeds player's stack" };
  }

  // Cannot place a new bet when a bet already exists; must raise instead
  if (action.action === "bet" && gameState.currentHighestBet > 0) {
    return { isValid: false, error: "Cannot bet; there is already a bet. Use raise." };
  }

  const totalBetNeeded = gameState.currentHighestBet - player.currentBet;
  if (
    gameState.currentHighestBet > 0 &&
    action.amount < totalBetNeeded &&
    action.amount !== player.stack
  ) {
    return {
      isValid: false,
      error: `Must put in at least ${totalBetNeeded} to call`,
    };
  }

  // Enforce table minimums
  if (action.action === "bet" && gameState.currentHighestBet === 0) {
    if (action.amount < gameState.bigBlind && action.amount !== player.stack) {
      return {
        isValid: false,
        error: `Minimum bet is ${gameState.bigBlind}`,
      };
    }
  }

  // For raises, ensure minimum raise amount
  if (
    action.action === "raise" &&
    // Require the new total to be at least 2x currentHighestBet (UI contract) or all-in
    // This approximates NLHE min-raise without tracking last raise size
    (player.currentBet + action.amount) < Math.max(
      gameState.bigBlind,
      gameState.currentHighestBet * 2
    ) &&
    action.amount !== player.stack
  ) {
    const minTargetTotal = Math.max(
      gameState.bigBlind,
      gameState.currentHighestBet * 2
    );
    const minRaiseDelta = Math.max(1, minTargetTotal - player.currentBet);
    return { isValid: false, error: `Minimum raise is ${minRaiseDelta}` };
  }

  return { isValid: true };
}

function validateCall(
  gameState: GameState,
  player: Player
): { isValid: boolean; error?: string } {
  if (gameState.currentHighestBet === 0) {
    return { isValid: false, error: "No bet to call" };
  }

  if (player.stack <= 0) {
    return { isValid: false, error: "No chips left to call" };
  }

  return { isValid: true };
}

function validateCheck(
  gameState: GameState,
  player: Player
): { isValid: boolean; error?: string } {
  if (gameState.currentHighestBet > player.currentBet) {
    return { isValid: false, error: "Cannot check, there is a bet to call" };
  }

  return { isValid: true };
}

// ============================================================================
// ACTION HANDLING
// ============================================================================

export function processAction(
  gameState: GameState,
  action: GameAction
): ActionResult {
  const validation = validateAction(gameState, action);

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
      newGameState: gameState,
    };
  }

  let newGameState: GameState;

  switch (action.action) {
    case "bet":
    case "raise":
      newGameState = processBetOrRaise(gameState, action);
      break;
    case "call":
      newGameState = processCall(gameState, action);
      break;
    case "check":
      newGameState = processCheck(gameState);
      break;
    case "fold":
      newGameState = processFold(gameState, action);
      break;
    default:
      return {
        success: false,
        error: "Invalid action type",
        newGameState: gameState,
      };
  }

  // Determine next action
  const nextAction = determineNextAction(newGameState);

  return {
    success: true,
    newGameState,
    nextAction,
  };
}

function processBetOrRaise(
  gameState: GameState,
  action: GameAction
): GameState {
  const player = getPlayerById(gameState, action.playerId)!;
  const betAmount = action.amount!;

  const newCurrentBet = player.currentBet + betAmount;
  const newStack = player.stack - betAmount;

  let newGameState = updatePlayer(gameState, action.playerId, {
    stack: newStack,
    currentBet: newCurrentBet,
  });

  newGameState = {
    ...newGameState,
    pot: gameState.pot + betAmount,
    currentHighestBet: Math.max(gameState.currentHighestBet, newCurrentBet),
    lastAction: action.action,
    lastBetAmount: newCurrentBet,
  };

  return newGameState;
}

function processCall(gameState: GameState, action: GameAction): GameState {
  const player = getPlayerById(gameState, action.playerId)!;
  // Allow all-in for less by capping call amount to player's stack
  const toCall = Math.max(0, gameState.currentHighestBet - player.currentBet);
  const callAmount = Math.min(toCall, player.stack);

  const newCurrentBet = player.currentBet + callAmount;
  const newStack = player.stack - callAmount;

  let newGameState = updatePlayer(gameState, action.playerId, {
    stack: newStack,
    currentBet: newCurrentBet,
  });

  newGameState = {
    ...newGameState,
    pot: gameState.pot + callAmount,
    lastAction: "call",
    lastBetAmount: newCurrentBet,
  };

  return newGameState;
}

function processCheck(gameState: GameState): GameState {
  return {
    ...gameState,
    lastAction: "check",
    lastBetAmount: 0,
  };
}

function processFold(gameState: GameState, action: GameAction): GameState {
  const newGameState = updatePlayer(gameState, action.playerId, {
    hasFolded: true,
  });

  return {
    ...newGameState,
    lastAction: "fold",
    lastBetAmount: 0,
  };
}

// ============================================================================
// GAME PROGRESSION
// ============================================================================

function determineNextAction(
  gameState: GameState
): "advance_round" | "next_player" | "end_game" | "showdown" | undefined {
  const activePlayers = getActivePlayers(gameState);

  // Check if only one player remains
  if (activePlayers.length === 1) {
    return "end_game";
  }

  // Check if all active players have equal bets (or are all-in)
  const allBetsEqual = activePlayers.every(
    (player) =>
      player.currentBet === gameState.currentHighestBet || player.stack === 0
  );

  if (!allBetsEqual) {
    return "next_player";
  }

  // Unified rotation completion check: if all bets are equal and the next
  // eligible player equals the round's first-to-act, the round is complete.
  const buttonIndexAll = gameState.players.findIndex((p) => p.isButton);
  if (buttonIndexAll === -1) {
    throw new Error("No button player found");
  }

  const findNthEligibleAfter = (startIndex: number, n: number): Player => {
    const total = gameState.players.length;
    let found = 0;
    for (let offset = 1; offset <= total * 2; offset++) {
      const idx = (startIndex + offset) % total;
      const candidate = gameState.players[idx]!;
      if (!candidate.hasFolded && candidate.stack > 0) {
        found++;
        if (found === n) return candidate;
      }
    }
    return activePlayers.find((p) => p.stack > 0) ?? activePlayers[0]!;
  };

  const isHeadsUp = activePlayers.length === 2;
  const firstToActId =
    gameState.currentRound === "pre-flop"
      ? isHeadsUp
        ? gameState.players[buttonIndexAll]!.hasFolded ||
          gameState.players[buttonIndexAll]!.stack === 0
          ? findNthEligibleAfter(buttonIndexAll, 1).id
          : gameState.players[buttonIndexAll]!.id
        : findNthEligibleAfter(buttonIndexAll, 3).id
      : findNthEligibleAfter(buttonIndexAll, 1).id;

  // Compute next eligible player after the current player
  const currentIndexAll = gameState.players.findIndex(
    (p) => p.id === gameState.currentPlayerTurn
  );
  let nextActiveId = activePlayers.find((p) => p.stack > 0)?.id ?? activePlayers[0]!.id;
  if (currentIndexAll !== -1) {
    const total = gameState.players.length;
    for (let offset = 1; offset <= total * 2; offset++) {
      const idx = (currentIndexAll + offset) % total;
      const candidate = gameState.players[idx]!;
      if (!candidate.hasFolded && candidate.stack > 0) {
        nextActiveId = candidate.id;
        break;
      }
    }
  }

  if (nextActiveId === firstToActId) {
    return gameState.currentRound === "river" ? "showdown" : "advance_round";
  }

  return "next_player";
}

export function advanceToNextRound(gameState: GameState): GameState {
  const nextRound = ROUND_PROGRESSION[gameState.currentRound];

  if (!nextRound) {
    throw new Error("Cannot advance from current round");
  }

  // Reset current bets for new round
  const resetPlayers = gameState.players.map((player) => ({
    ...player,
    currentBet: 0,
  }));

  let newGameState: GameState = {
    ...gameState,
    currentRound: nextRound,
    currentHighestBet: 0,
    players: resetPlayers,
  };

  // Deal cards for new round and set first player to act
  newGameState = dealCards(newGameState);
  newGameState = setFirstPlayerToAct(newGameState);

  return newGameState;
}

export function advanceToNextPlayer(gameState: GameState): GameState {
  return setNextPlayer(gameState);
}

// ============================================================================
// WINNER DETERMINATION
// ============================================================================

export function findWinners(gameState: GameState): WinnerResult {
  const activePlayers = getActivePlayers(gameState);

  if (activePlayers.length === 0) {
    throw new Error("No active players to find winners");
  }

  // If only one player remains, they win
  if (activePlayers.length === 1) {
    return {
      winners: activePlayers,
      evaluations: [
        {
          player: activePlayers[0]!,
          evaluation: { rank: 0, value: 0, name: "Winner by default" },
        },
      ],
    };
  }

  // Evaluate each player's hand
  const evaluations = activePlayers.map((player) => {
    const allCards = [...player.holeCards, ...gameState.communityCards];
    // Cast pure Card types to database Card types for evaluation
    const dbCards = allCards.map((card) => ({
      ...card,
      id: 0, // Dummy values for evaluation
      gameId: null,
      playerId: null,
    }));
    const evaluation = evaluateHand(
      dbCards as Parameters<typeof evaluateHand>[0]
    );
    return { player, evaluation };
  });

  // Find the best hand rank
  const bestRank = Math.max(...evaluations.map((e) => e.evaluation.rank));
  const bestHands = evaluations.filter((e) => e.evaluation.rank === bestRank);

  // If only one player has the best hand, they win
  if (bestHands.length === 1) {
    return {
      winners: [bestHands[0]!.player],
      evaluations,
    };
  }

  // Multiple players have the same hand rank, compare values
  const bestValue = Math.max(...bestHands.map((e) => e.evaluation.value));
  const winners = bestHands
    .filter((e) => e.evaluation.value === bestValue)
    .map((e) => e.player);

  return { winners, evaluations };
}

export function distributeWinnings(
  gameState: GameState,
  winners: Player[]
): GameState {
  if (winners.length === 0) {
    throw new Error("No winners provided");
  }

  const potPerWinner = Math.floor(gameState.pot / winners.length);
  const remainder = gameState.pot % winners.length;

  let newGameState = { ...gameState };

  // Distribute winnings
  winners.forEach((winner, index) => {
    const extraChip = index < remainder ? 1 : 0;
    const winnings = potPerWinner + extraChip;

    // Get current player data from game state to avoid stale stack values
    const currentPlayer = newGameState.players.find((p) => p.id === winner.id)!;

    newGameState = updatePlayer(newGameState, winner.id, {
      stack: currentPlayer.stack + winnings,
      hasWon: true,
    });
  });

  return {
    ...newGameState,
    pot: 0,
    status: "completed",
    currentRound: "showdown",
  };
}

export function handleShowdown(gameState: GameState): GameState {
  const { winners } = findWinners(gameState);
  const afterPayout = distributeWinnings(gameState, winners);
  return handleMuck(afterPayout);
}

/** Function that is called after finding the winners, which decides based on the game state whether to muck or show a player's cards */
export function handleMuck(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);

  // If the pot was won uncontested (everyone folded), no cards are revealed
  if (activePlayers.length <= 1) {
    return {
      ...gameState,
      players: gameState.players.map((p) => ({ ...p, showCards: false })),
    };
  }

  // Otherwise we are at showdown with multiple contenders: reveal winners, muck others
  const { winners } = findWinners(gameState);
  const winnerIds = new Set(winners.map((w) => w.id));

  return {
    ...gameState,
    players: gameState.players.map((p) => ({
      ...p,
      showCards: winnerIds.has(p.id),
    })),
  };
}

export function handleSinglePlayerWin(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);

  if (activePlayers.length !== 1) {
    throw new Error("Expected exactly one active player");
  }

  const winner = activePlayers[0]!;
  return distributeWinnings(gameState, [winner]);
}

/**
 * Force-fold a player regardless of turn. Does not advance the turn automatically.
 * Use when a player disconnects or leaves out of turn. Caller may decide to advance.
 */
export function forceFoldPlayer(gameState: GameState, playerId: string): GameState {
  const player = getPlayerById(gameState, playerId);
  if (!player || player.hasFolded) return gameState;
  const newGameState = updatePlayer(gameState, playerId, { hasFolded: true });
  return {
    ...newGameState,
    lastAction: "fold",
    lastBetAmount: 0,
  };
}

// ============================================================================
// MAIN GAME ENGINE FUNCTION
// ============================================================================

export function executeGameAction(
  gameState: GameState,
  action: GameAction
): GameState {
  const result = processAction(gameState, action);

  if (!result.success) {
    throw new Error(result.error ?? "Action failed");
  }

  let newGameState = result.newGameState;

  // Handle next action
  switch (result.nextAction) {
    case "next_player":
      newGameState = advanceToNextPlayer(newGameState);
      break;
    case "advance_round":
      newGameState = advanceToNextRound(newGameState);
      break;
    case "showdown":
      newGameState = handleShowdown(newGameState);
      break;
    case "end_game":
      newGameState = handleSinglePlayerWin(newGameState);
      break;
  }

  return newGameState;
}
