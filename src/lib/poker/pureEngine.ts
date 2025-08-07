// Pure TypeScript Poker Game Engine
// This module handles all game transitions, validations, and winner calculations
// It has no dependencies on databases, sockets, or React - only pure functions

import { evaluateHand, generateDeck, getAvailableCards, getRandomCards } from "./cards";
import type {
    ActionResult,
    Card,
    GameAction,
    GameState,
    Player,
    RoundType,
    WinnerResult
} from "./types";

// Re-export types for external use
export type {
    ActionResult,
    Card, GameAction, GameState,
    Player, WinnerResult
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
  };
}

export function addPlayerToGame(gameState: GameState, playerId: string, stack: number): GameState {
  const newPlayer: Player = {
    id: playerId,
    seat: gameState.players.length,
    stack,
    currentBet: 0,
    hasFolded: false,
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
  const resetPlayers = gameState.players.map(player => ({
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
  if (!resetPlayers.some(p => p.isButton)) {
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
  return gameState.players.filter(player => !player.hasFolded);
}

export function getPlayerById(gameState: GameState, playerId: string): Player | undefined {
  return gameState.players.find(player => player.id === playerId);
}

export function updatePlayer(gameState: GameState, playerId: string, updates: Partial<Player>): GameState {
  return {
    ...gameState,
    players: gameState.players.map(player =>
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

  const buttonPlayer = activePlayers.find(p => p.isButton);
  if (!buttonPlayer) {
    throw new Error("No button player found");
  }
  
  const buttonIndex = activePlayers.findIndex(p => p.id === buttonPlayer.id);
  let firstPlayerIndex: number;

  if (gameState.currentRound === "pre-flop") {
    // Pre-flop: Action starts with UTG (left of big blind)
    // In heads-up: big blind acts first pre-flop
    if (activePlayers.length === 2) {
      firstPlayerIndex = buttonIndex; // Button is small blind and acts first pre-flop in heads-up
    } else {
      firstPlayerIndex = (buttonIndex + 3) % activePlayers.length; // UTG (left of big blind)
    }
  } else {
    // Post-flop: Action starts with small blind (left of button)
    firstPlayerIndex = (buttonIndex + 1) % activePlayers.length;
  }

  const firstPlayer = activePlayers[firstPlayerIndex];
  
  return {
    ...gameState,
    currentPlayerTurn: firstPlayer!.id,
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

  // Find next active player
  const currentPlayerIndex = activePlayers.findIndex(p => p.id === gameState.currentPlayerTurn);
  if (currentPlayerIndex === -1) {
    throw new Error("Current player not found in active players");
  }

  const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
  const nextPlayer = activePlayers[nextPlayerIndex];

  return {
    ...gameState,
    currentPlayerTurn: nextPlayer!.id,
  };
}

// ============================================================================
// BLIND POSTING
// ============================================================================

export function postBlinds(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);
  
  if (activePlayers.length < 2) {
    throw new Error("Need at least 2 players to post blinds");
  }

  const buttonPlayer = activePlayers.find(p => p.isButton);
  if (!buttonPlayer) {
    throw new Error("No button player found");
  }
  
  const buttonIndex = activePlayers.findIndex(p => p.id === buttonPlayer.id);
  
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
  const smallBlindAmount = Math.min(gameState.smallBlind, smallBlindPlayer.stack);
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
    ...activePlayers.flatMap(player => player.holeCards),
  ];

  // Get available cards
  const availableCards = getAvailableCards(gameState.deck, dealtCards);

  let newGameState = { ...gameState };

  switch (gameState.currentRound) {
    case "pre-flop":
      // Deal 2 hole cards to each active player
      activePlayers.forEach(player => {
        const holeCards = getRandomCards(availableCards, 2);
        newGameState = updatePlayer(newGameState, player.id, { holeCards });
        // Remove dealt cards from available pool
        holeCards.forEach(card => {
          const index = availableCards.findIndex(c => c.rank === card.rank && c.suit === card.suit);
          if (index > -1) availableCards.splice(index, 1);
        });
      });
      break;

    case "flop":
      // Deal 3 community cards
      newGameState.communityCards = [...gameState.communityCards, ...getRandomCards(availableCards, 3)];
      break;

    case "turn":
    case "river":
      // Deal 1 community card
      newGameState.communityCards = [...gameState.communityCards, ...getRandomCards(availableCards, 1)];
      break;

    default:
      throw new Error(`Cannot deal cards for round: ${gameState.currentRound}`);
  }

  return newGameState;
}

// ============================================================================
// ACTION VALIDATION
// ============================================================================

export function validateAction(gameState: GameState, action: GameAction): { isValid: boolean; error?: string } {
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

function validateBetOrRaise(gameState: GameState, player: Player, action: GameAction): { isValid: boolean; error?: string } {
  if (!action.amount || action.amount <= 0) {
    return { isValid: false, error: "Bet amount must be positive" };
  }

  if (action.amount > player.stack) {
    return { isValid: false, error: "Bet amount exceeds player's stack" };
  }

  const totalBetNeeded = gameState.currentHighestBet - player.currentBet;
  if (action.amount < totalBetNeeded && action.amount !== player.stack) {
    return { isValid: false, error: `Must bet at least ${totalBetNeeded} to call current bet` };
  }

  // For raises, ensure minimum raise amount
  if (action.action === "raise" && action.amount < gameState.currentHighestBet + gameState.bigBlind) {
    return { isValid: false, error: `Minimum raise is ${gameState.bigBlind}` };
  }

  return { isValid: true };
}

function validateCall(gameState: GameState, player: Player): { isValid: boolean; error?: string } {
  if (gameState.currentHighestBet === 0) {
    return { isValid: false, error: "No bet to call" };
  }

  const callAmount = gameState.currentHighestBet - player.currentBet;
  if (callAmount > player.stack) {
    return { isValid: false, error: "Insufficient stack to call" };
  }

  return { isValid: true };
}

function validateCheck(gameState: GameState, player: Player): { isValid: boolean; error?: string } {
  if (gameState.currentHighestBet > player.currentBet) {
    return { isValid: false, error: "Cannot check, there is a bet to call" };
  }

  return { isValid: true };
}

// ============================================================================
// ACTION HANDLING
// ============================================================================

export function processAction(gameState: GameState, action: GameAction): ActionResult {
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
      newGameState = processCheck(gameState, action);
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

function processBetOrRaise(gameState: GameState, action: GameAction): GameState {
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
  const callAmount = gameState.currentHighestBet - player.currentBet;

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

function processCheck(gameState: GameState, _action: GameAction): GameState {
  return {
    ...gameState,
    lastAction: "check",
    lastBetAmount: 0,
  };
}

function processFold(gameState: GameState, action: GameAction): GameState {
  const newGameState = updatePlayer(gameState, action.playerId, { hasFolded: true });

  return {
    ...newGameState,
    lastAction: "fold",
    lastBetAmount: 0,
  };
}

// ============================================================================
// GAME PROGRESSION
// ============================================================================

function determineNextAction(gameState: GameState): "advance_round" | "next_player" | "end_game" | "showdown" | undefined {
  const activePlayers = getActivePlayers(gameState);

  // Check if only one player remains
  if (activePlayers.length === 1) {
    return "end_game";
  }

  // Check if all active players have equal bets (or are all-in)
  const allBetsEqual = activePlayers.every(player => 
    player.currentBet === gameState.currentHighestBet || player.stack === 0
  );

  if (!allBetsEqual) {
    return "next_player";
  }

  // For pre-flop, we need to handle the Big Blind option
  if (gameState.currentRound === "pre-flop") {
    // Find the big blind player
    const buttonPlayer = activePlayers.find(p => p.isButton);
    if (!buttonPlayer) {
      throw new Error("No button player found");
    }
    
    const buttonIndex = activePlayers.findIndex(p => p.id === buttonPlayer.id);
    let bigBlindIndex: number;
    
    if (activePlayers.length === 2) {
      bigBlindIndex = (buttonIndex + 1) % activePlayers.length;
    } else {
      bigBlindIndex = (buttonIndex + 2) % activePlayers.length;
    }
    
    const bigBlindPlayer = activePlayers[bigBlindIndex];
    
    // If no one raised above the big blind, BB gets option to check or raise
    if (gameState.currentHighestBet === gameState.bigBlind && gameState.currentPlayerTurn !== bigBlindPlayer!.id) {
      // Need to give BB the option
      return "next_player";
    }
  }

  // For heads-up play, ensure both players have had a chance to act
  if (activePlayers.length === 2) {
    const currentPlayerIndex = activePlayers.findIndex(p => p.id === gameState.currentPlayerTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
    
    // Check if we've completed a full rotation
    if (gameState.currentRound === "pre-flop") {
      // In pre-flop heads-up, if we're back to the big blind and they've acted, round is complete
      const buttonIndex = activePlayers.findIndex(p => p.isButton);
      const bigBlindIndex = (buttonIndex + 1) % activePlayers.length;
      
      if (currentPlayerIndex === bigBlindIndex) {
        // Big blind has acted, round is complete
      } else {
        return "next_player";
      }
    } else {
      // Post-flop: if next player to act is the one who started this round, it's complete
      const firstToActIndex = activePlayers.findIndex(p => p.isButton) === 0 ? 1 : 0;
      if (nextPlayerIndex !== firstToActIndex) {
        return "next_player";
      }
    }
  }

  // All players have acted and bets are equal, advance to next round
  if (gameState.currentRound === "river") {
    return "showdown";
  } else {
    return "advance_round";
  }
}

export function advanceToNextRound(gameState: GameState): GameState {
  const nextRound = ROUND_PROGRESSION[gameState.currentRound];
  
  if (!nextRound) {
    throw new Error("Cannot advance from current round");
  }

  // Reset current bets for new round
  const resetPlayers = gameState.players.map(player => ({
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
      evaluations: [{
        player: activePlayers[0]!,
        evaluation: { rank: 0, value: 0, name: "Winner by default" },
      }],
    };
  }

  // Evaluate each player's hand
  const evaluations = activePlayers.map(player => {
    const allCards = [...player.holeCards, ...gameState.communityCards];
    // Cast pure Card types to database Card types for evaluation
    const dbCards = allCards.map(card => ({
      ...card,
      id: 0, // Dummy values for evaluation
      gameId: null,
      playerId: null,
    }));
    const evaluation = evaluateHand(dbCards as Parameters<typeof evaluateHand>[0]);
    return { player, evaluation };
  });

  // Find the best hand rank
  const bestRank = Math.max(...evaluations.map(e => e.evaluation.rank));
  const bestHands = evaluations.filter(e => e.evaluation.rank === bestRank);

  // If only one player has the best hand, they win
  if (bestHands.length === 1) {
    return {
      winners: [bestHands[0]!.player],
      evaluations,
    };
  }

  // Multiple players have the same hand rank, compare values
  const bestValue = Math.max(...bestHands.map(e => e.evaluation.value));
  const winners = bestHands
    .filter(e => e.evaluation.value === bestValue)
    .map(e => e.player);

  return { winners, evaluations };
}

export function distributeWinnings(gameState: GameState, winners: Player[]): GameState {
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
    const currentPlayer = newGameState.players.find(p => p.id === winner.id)!;
    
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
  return distributeWinnings(gameState, winners);
}

export function handleSinglePlayerWin(gameState: GameState): GameState {
  const activePlayers = getActivePlayers(gameState);
  
  if (activePlayers.length !== 1) {
    throw new Error("Expected exactly one active player");
  }

  const winner = activePlayers[0]!;
  return distributeWinnings(gameState, [winner]);
}

// ============================================================================
// MAIN GAME ENGINE FUNCTION
// ============================================================================

export function executeGameAction(gameState: GameState, action: GameAction): GameState {
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