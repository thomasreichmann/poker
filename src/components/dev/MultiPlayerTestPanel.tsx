"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { PokerAction } from "@/db/schema/actionTypes";
import { Game } from "@/db/schema/games";
import { Player } from "@/db/schema/players";
import { useDevAccess } from "@/hooks/useDevAccess";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Play,
  RotateCcw,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MultiPlayerTestPanelProps = {
  gameId: string;
  game: Game | null;
  players: Player[];
  currentPlayerId?: string;
  floating?: boolean;
};

export function MultiPlayerTestPanel({
  gameId,
  game,
  players,
  currentPlayerId,
  floating = true,
}: MultiPlayerTestPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [quickRaiseAmount, setQuickRaiseAmount] = useState<number>(0);
  const [autoFollowTurn, setAutoFollowTurn] = useState(true);

  const trpc = useTRPC();
  const { toast } = useToast();
  const { isLoading: isLoadingAccess, canShowDevFeatures } = useDevAccess();

  const actMutation = useMutation(trpc.dev.actAsPlayer.mutationOptions());
  const advanceMutation = useMutation(trpc.dev.advanceGame.mutationOptions());
  const resetMutation = useMutation(trpc.dev.resetGame.mutationOptions());

  // Initialize selected player
  useEffect(() => {
    if (!selectedPlayerId && players.length > 0) {
      const activePlayer = players.find((p) => p.id === currentPlayerId);
      setSelectedPlayerId(activePlayer?.id || players[0]?.id || "");
    }
  }, [players, currentPlayerId, selectedPlayerId]);

  // Auto-follow current player's turn
  useEffect(() => {
    if (
      autoFollowTurn &&
      currentPlayerId &&
      currentPlayerId !== selectedPlayerId
    ) {
      setSelectedPlayerId(currentPlayerId);
    }
  }, [autoFollowTurn, currentPlayerId, selectedPlayerId]);

  // Set quick raise amount based on game
  useEffect(() => {
    if (game) {
      setQuickRaiseAmount(game.bigBlind * 3);
    }
  }, [game]);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId) || null,
    [players, selectedPlayerId]
  );

  const activePlayer = useMemo(
    () => players.find((p) => p.id === currentPlayerId) || null,
    [players, currentPlayerId]
  );

  const canCheck = useMemo(() => {
    if (!game || !selectedPlayer) return false;
    return (game.currentHighestBet ?? 0) <= (selectedPlayer.currentBet ?? 0);
  }, [game, selectedPlayer]);

  const canCall = useMemo(() => {
    if (!game || !selectedPlayer) return false;
    const tableBet = game.currentHighestBet ?? 0;
    return (
      tableBet > (selectedPlayer.currentBet ?? 0) && selectedPlayer.stack > 0
    );
  }, [game, selectedPlayer]);

  const callAmount = useMemo(() => {
    if (!game || !selectedPlayer) return 0;
    const diff =
      (game.currentHighestBet ?? 0) - (selectedPlayer.currentBet ?? 0);
    return Math.max(0, Math.min(diff, selectedPlayer.stack));
  }, [game, selectedPlayer]);

  const minRaiseTotal = useMemo(() => {
    if (!game) return 0;
    const tableBet = game.currentHighestBet ?? 0;
    return tableBet === 0
      ? game.bigBlind
      : Math.max(tableBet * 2, game.bigBlind);
  }, [game]);

  const maxRaiseTotal = useMemo(() => {
    if (!selectedPlayer) return 0;
    return (selectedPlayer.currentBet ?? 0) + (selectedPlayer.stack ?? 0);
  }, [selectedPlayer]);

  const executeAction = async (action: PokerAction, amount?: number) => {
    if (!game || !selectedPlayer) return;

    try {
      const payload: {
        gameId: string;
        targetPlayerId: string;
        action: PokerAction;
        amount?: number;
      } = {
        gameId: game.id,
        targetPlayerId: selectedPlayer.id,
        action,
      };

      if (action === "raise" || action === "bet") {
        const targetTotal = Math.max(
          minRaiseTotal,
          Math.min(maxRaiseTotal, amount ?? quickRaiseAmount)
        );
        const delta =
          action === "bet"
            ? targetTotal
            : targetTotal - (selectedPlayer.currentBet ?? 0);
        payload.amount = Math.max(1, delta);
      }

      await actMutation.mutateAsync(payload);

      toast({
        title: "Action executed",
        description: `${
          selectedPlayer.displayName || `Seat ${selectedPlayer.seat}`
        } ${action}${amount ? ` $${amount}` : ""}`,
      });

      // Auto-advance to next player after action if auto-follow is enabled
      if (autoFollowTurn) {
        const nextPlayer = getNextActivePlayer();
        if (nextPlayer && nextPlayer.id !== selectedPlayerId) {
          setSelectedPlayerId(nextPlayer.id);
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getNextActivePlayer = () => {
    if (!currentPlayerId || players.length === 0) return null;

    const currentIndex = players.findIndex((p) => p.id === currentPlayerId);
    if (currentIndex === -1) return null;

    for (let i = 1; i < players.length; i++) {
      const nextIndex = (currentIndex + i) % players.length;
      const player = players[nextIndex];
      if (player && !player.hasFolded && player.stack > 0) {
        return player;
      }
    }
    return null;
  };

  const handleAdvanceGame = async () => {
    try {
      await advanceMutation.mutateAsync({ gameId });
      toast({ title: "Game advanced" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to advance game",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleResetGame = async () => {
    try {
      await resetMutation.mutateAsync({ gameId });
      toast({ title: "Game reset" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to reset game",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Loading state while checking permissions
  if (isLoadingAccess) {
    return null;
  }

  // Hide panel if user doesn't have dev access
  if (!canShowDevFeatures) {
    return null;
  }

  return (
    <Card
      className={cn(
        "w-96 bg-slate-800 border-slate-700 text-white shadow-xl z-50",
        floating && "fixed top-20 right-4"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            <CardTitle className="text-sm">Multi-Player Test Panel</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Game Info */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-3 w-3" />
            <span>{players.length} players</span>
            <span>•</span>
            <span>Pot: ${game?.pot ?? 0}</span>
            <span>•</span>
            <span>{game?.currentRound ?? "pre-flop"}</span>
          </div>

          {/* Active Player Info */}
          {activePlayer && (
            <div className="flex items-center gap-2 p-2 bg-slate-700 rounded">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">
                Turn: {activePlayer.displayName || `Seat ${activePlayer.seat}`}
              </span>
              <Badge variant="outline" className="text-xs">
                ${activePlayer.stack}
              </Badge>
              {autoFollowTurn && selectedPlayerId === currentPlayerId && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-blue-400" />
                  <span className="text-xs text-blue-400">Following</span>
                </div>
              )}
            </div>
          )}

          {/* Player Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Control Player:</label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-follow"
                  checked={autoFollowTurn}
                  onCheckedChange={(checked) =>
                    setAutoFollowTurn(checked === true)
                  }
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <label
                  htmlFor="auto-follow"
                  className="text-xs text-slate-400 cursor-pointer"
                >
                  Auto-follow turn
                </label>
              </div>
            </div>
            <Select
              value={selectedPlayerId}
              onValueChange={(value) => {
                setSelectedPlayerId(value);
                // Temporarily disable auto-follow when manually selecting
                if (autoFollowTurn && value !== currentPlayerId) {
                  setAutoFollowTurn(false);
                }
              }}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    <div className="flex items-center gap-2">
                      <span>{player.displayName || `Seat ${player.seat}`}</span>
                      <Badge
                        variant={
                          player.id === currentPlayerId ? "default" : "outline"
                        }
                        className="text-xs"
                      >
                        ${player.stack}
                      </Badge>
                      {player.hasFolded && (
                        <span className="text-red-400 text-xs">(Folded)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Actions */}
          {selectedPlayer && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => executeAction("fold")}
                  disabled={selectedPlayer.id !== currentPlayerId}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  Fold
                </Button>

                {canCheck ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => executeAction("check")}
                    disabled={selectedPlayer.id !== currentPlayerId}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                  >
                    Check
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => executeAction("call")}
                    disabled={selectedPlayer.id !== currentPlayerId || !canCall}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    Call ${callAmount}
                  </Button>
                )}
              </div>

              {/* Raise Controls */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={quickRaiseAmount}
                    onChange={(e) =>
                      setQuickRaiseAmount(Number(e.target.value) || 0)
                    }
                    className="bg-slate-700 border-slate-600 text-xs"
                    min={minRaiseTotal}
                    max={maxRaiseTotal}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => executeAction("raise", quickRaiseAmount)}
                    disabled={
                      selectedPlayer.id !== currentPlayerId ||
                      quickRaiseAmount < minRaiseTotal
                    }
                    className="text-xs bg-green-600 hover:bg-green-700 text-white border-0"
                  >
                    Raise
                  </Button>
                </div>
                <div className="flex gap-1">
                  {[2, 3, 5].map((multiplier) => (
                    <Button
                      key={multiplier}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setQuickRaiseAmount(
                          game?.bigBlind ? game.bigBlind * multiplier : 0
                        )
                      }
                      className="text-xs px-2 bg-slate-600 hover:bg-slate-500 text-white border-slate-500"
                    >
                      {multiplier}BB
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickRaiseAmount(maxRaiseTotal)}
                    className="text-xs px-2 bg-amber-600 hover:bg-amber-700 text-white border-amber-500"
                  >
                    All-in
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Game Controls */}
          <div className="flex gap-2 pt-2 border-t border-slate-700">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdvanceGame}
              className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
            >
              <Play className="h-3 w-3 mr-1" />
              Advance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetGame}
              className="flex-1 text-xs bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>

          {/* Status */}
          {actMutation.isPending && (
            <div className="text-xs text-blue-400 text-center">
              Executing action...
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
