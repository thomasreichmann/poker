import { useCallback, useEffect, useState } from "react";
import { gameStore } from "./gameStore";
import { GameState, Player } from "./gameTypes";

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(gameStore.getState());
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // Subscribe to game store changes
  useEffect(() => {
    const unsubscribe = gameStore.subscribe((newState) => {
      setGameState(newState);
    });
    return unsubscribe;
  }, []);

  // Initialize game
  useEffect(() => {
    gameStore.initializeGame();
  }, []);

  // Visual turn timer: counts down from 30s without auto-fold side effects
  useEffect(() => {
    // Reset timer on phase or player change
    setTimeLeft(30);

    if (gameState.phase === "waiting" || gameState.phase === "showdown") {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.activePlayerIndex, gameState.phase]);

  // Update raise amount baseline when betting context changes
  useEffect(() => {
    const currentPlayer = gameState.players[gameState.activePlayerIndex];
    if (currentPlayer?.id === "player1") {
      const minRaiseTotal = Math.max(
        gameState.currentBet * 2,
        gameState.bigBlind
      );
      const call = gameState.currentBet - (currentPlayer?.currentBet || 0);
      const baseline = gameState.currentBet > 0 ? call : minRaiseTotal;
      setRaiseAmount(baseline);
    }
  }, [
    gameState.currentBet,
    gameState.activePlayerIndex,
    gameState.bigBlind,
    gameState.players,
  ]);

  const handlePlayerAction = useCallback(
    (action: string, amount?: number) => {
      if (isAnimating) return;

      gameStore.handlePlayerAction(action, amount);
      setTimeLeft(30);
    },
    [isAnimating]
  );

  const handleRaiseAmountChange = (delta: number) => {
    const currentPlayer = gameState.players[gameState.activePlayerIndex];
    const minRaiseTotal = Math.max(
      gameState.currentBet * 2,
      gameState.bigBlind
    );
    const call = gameState.currentBet - (currentPlayer?.currentBet || 0);
    const minBound = gameState.currentBet > 0 ? call : minRaiseTotal;
    const maxBound = currentPlayer?.chips || 0;
    const newAmount = Math.max(
      minBound,
      Math.min(maxBound, raiseAmount + delta)
    );
    setRaiseAmount(newAmount);
  };

  const handleRaiseInputChange = (value: string) => {
    const currentPlayer = gameState.players[gameState.activePlayerIndex];
    const minRaiseTotal = Math.max(
      gameState.currentBet * 2,
      gameState.bigBlind
    );
    const call = gameState.currentBet - (currentPlayer?.currentBet || 0);
    const minBound = gameState.currentBet > 0 ? call : minRaiseTotal;
    const maxBound = currentPlayer?.chips || 0;
    const numValue = Number.parseInt(value) || 0;
    const clampedValue = Math.max(minBound, Math.min(maxBound, numValue));
    setRaiseAmount(clampedValue);
  };

  const startNewHand = (players: Player[]) => {
    setIsAnimating(true);
    gameStore.startNewHand(players);
    setTimeout(() => setIsAnimating(false), 1500);
  };

  const toggleTestingMode = () => {
    gameStore.toggleTestingMode();
  };

  // Computed values
  const currentPlayer = gameState.players[gameState.activePlayerIndex];
  const isYourTurn = currentPlayer?.id === "player1";
  const canCheck =
    gameState.currentBet === 0 ||
    currentPlayer?.currentBet === gameState.currentBet;
  const canCall =
    gameState.currentBet > 0 &&
    currentPlayer?.currentBet < gameState.currentBet;
  const callAmount = gameState.currentBet - (currentPlayer?.currentBet || 0);
  const minRaise = Math.max(gameState.currentBet * 2, gameState.bigBlind);
  const maxRaise = currentPlayer?.chips || 0;

  return {
    gameState,
    raiseAmount,
    isAnimating,
    soundEnabled,
    setSoundEnabled,
    timeLeft,
    showWinnerDialog,
    setShowWinnerDialog,
    winner,
    setWinner,
    handlePlayerAction,
    handleRaiseAmountChange,
    handleRaiseInputChange,
    startNewHand,
    isYourTurn,
    canCheck,
    canCall,
    callAmount,
    minRaise,
    maxRaise,
    currentPlayer,
    testingMode: gameState.testingMode,
    toggleTestingMode,
  };
};
