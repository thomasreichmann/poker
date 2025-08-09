"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// Removed Input in favor of a range slider for bet sizing
import { PlayingCard } from "@/components/ui/playing-card";
import { gameStore } from "@/lib/gameStore";
import type {
  PlayingCard as UiCard,
  Player as UiPlayer,
} from "@/lib/gameTypes";
import { useGameLogic } from "@/lib/useGameLogic";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Minus,
  Plus,
  Settings,
  TestTube,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function PokerGamePage() {
  const { id } = useParams() as { id: string };
  const trpc = useTRPC();
  const { data: gameData } = useQuery(trpc.game.getById.queryOptions({ id }));
  const {
    gameState,
    raiseAmount,
    isAnimating,
    soundEnabled,
    setSoundEnabled,
    showWinnerDialog,
    setShowWinnerDialog,
    winner,
    handlePlayerAction,
    handleRaiseAmountChange,
    handleRaiseInputChange,
    isYourTurn,
    canCheck,
    canCall,
    callAmount,
    minRaise,
    maxRaise,
    currentPlayer,
    testingMode,
    toggleTestingMode,
  } = useGameLogic();

  // Hydrate local game store from DB when data loads
  useEffect(() => {
    if (!gameData?.game) return;

    const dbGame = gameData.game;
    const dbPlayers = gameData.players ?? [];
    const dbCards = gameData.cards ?? [];

    const communityCards: UiCard[] = dbCards
      .filter((c) => c.playerId === null)
      .map((c, idx) => ({
        suit: c.suit as UiCard["suit"],
        rank: c.rank as UiCard["rank"],
        id: `${c.rank}-${c.suit}-${idx}`,
      }));

    const basePlayers: UiPlayer[] = dbPlayers
      .sort((a, b) => a.seat - b.seat)
      .map((p, idx) => ({
        id: p.id,
        name: `Player ${p.seat}`,
        avatar: "",
        chips: p.stack,
        position: idx,
        cards: dbCards
          .filter((c) => c.playerId === p.id)
          .map((c, cidx) => ({
            suit: c.suit as UiCard["suit"],
            rank: c.rank as UiCard["rank"],
            id: `${c.rank}-${c.suit}-${p.id}-${cidx}`,
          })),
        currentBet: p.currentBet ?? 0,
        totalBet: p.currentBet ?? 0,
        isActive: p.isConnected ?? true,
        isFolded: p.hasFolded ?? false,
        isAllIn: false,
        isDealer: p.isButton ?? false,
        isSmallBlind: false,
        isBigBlind: false,
      }));

    const dealerIndex = basePlayers.findIndex((p) => p.isDealer);
    const smallBlindIndex =
      dealerIndex >= 0
        ? (dealerIndex + 1) % basePlayers.length
        : 1 % basePlayers.length;
    const bigBlindIndex =
      dealerIndex >= 0
        ? (dealerIndex + 2) % basePlayers.length
        : 2 % basePlayers.length;

    const players: UiPlayer[] = basePlayers.map((p, idx) => ({
      ...p,
      isSmallBlind: idx === smallBlindIndex,
      isBigBlind: idx === bigBlindIndex,
    }));
    const activeIndex = dbGame.currentPlayerTurn
      ? Math.max(
          0,
          players.findIndex((p) => p.id === dbGame.currentPlayerTurn)
        )
      : 0;

    const phaseMap: Record<string, typeof gameState.phase> = {
      "pre-flop": "preflop",
      flop: "flop",
      turn: "turn",
      river: "river",
      showdown: "showdown",
    };

    gameStore.setState({
      players,
      communityCards,
      smallBlind: dbGame.smallBlind,
      bigBlind: dbGame.bigBlind,
      pot: dbGame.pot,
      currentBet: dbGame.currentHighestBet ?? 0,
      dealerIndex: dealerIndex >= 0 ? dealerIndex : 0,
      activePlayerIndex: activeIndex,
      phase: phaseMap[dbGame.currentRound ?? "pre-flop"] ?? "preflop",
    });
  }, [gameData]);

  // Slider min: call amount if facing a bet; if opening, min open
  const sliderMin = gameState.currentBet > 0 ? callAmount : minRaise;
  const sliderValue = Math.max(sliderMin, Math.min(maxRaise, raiseAmount));

  useEffect(() => {
    // Ensure slider starts at the correct baseline when action panel appears or context changes
    if (
      isYourTurn &&
      gameState.phase !== "waiting" &&
      gameState.phase !== "showdown"
    ) {
      if (raiseAmount !== sliderMin) {
        handleRaiseInputChange(String(sliderMin));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYourTurn, gameState.phase, sliderMin]);

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Sair da Mesa</span>
            </Link>
            <div className="text-sm text-slate-400">
              Mesa {String(id).slice(0, 8)} • R${" "}
              {gameData?.game?.smallBlind ?? gameState.smallBlind}/
              {gameData?.game?.bigBlind ?? gameState.bigBlind}
              {testingMode && (
                <Badge className="ml-2 bg-emerald-600 text-white text-xs">
                  TEST MODE
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span>Mão #{gameState.handNumber}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4 text-blue-400" />
              <span>
                {gameState.players.filter((p) => p.isActive).length}/
                {gameState.players.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-slate-400 hover:text-white"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTestingMode}
              className={`text-slate-400 hover:text-white ${
                testingMode ? "bg-emerald-600 text-white" : ""
              }`}
              title="Toggle Testing Mode - Start with all community cards dealt"
            >
              <TestTube className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Poker Table */}
      <div className="relative w-full h-screen pt-16 flex">
        {/* Main Table Area */}
        <div className="flex-1 flex items-center justify-center mb-56">
          <div className="relative">
            {/* Table Surface */}
            <div className="w-[800px] h-[500px] bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-full border-8 border-amber-950 shadow-2xl relative">
              {/* Table Felt Pattern */}
              <div className="absolute inset-4 bg-emerald-700 rounded-full opacity-30"></div>

              {/* Pot Area */}
              <div className="absolute top-[150px] left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-xl bg-yellow-500/10" />
                  <div className="relative flex items-center gap-3 bg-slate-900/70 backdrop-blur-sm border border-amber-400/40 rounded-full px-5 py-3 shadow-[0_0_30px_rgba(234,179,8,0.12)]">
                    <div className="flex -space-x-2 select-none">
                      <span className="w-7 h-7 rounded-full border-2 border-white/90 bg-red-500 shadow-inner" />
                      <span className="w-7 h-7 rounded-full border-2 border-white/90 bg-blue-500 shadow-inner translate-y-1" />
                      <span className="w-7 h-7 rounded-full border-2 border-white/90 bg-yellow-400 shadow-inner -translate-y-1" />
                    </div>
                    <div className="text-center min-w-[140px]">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
                        Pot
                      </div>
                      <div className="text-2xl font-extrabold text-amber-300 tabular-nums">
                        R$ {gameState.pot}
                      </div>
                    </div>
                    {gameState.currentBet > 0 && (
                      <div className="ml-1 text-xs text-amber-200/90 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 whitespace-nowrap">
                        Current Bet: R$ {gameState.currentBet}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Community Cards */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-20">
                <div className="flex space-x-2">
                  {gameState.communityCards.map((card, index) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="md"
                      isVisible={true}
                      isAnimating={isAnimating}
                      animationDelay={index * 200}
                    />
                  ))}
                  {/* Placeholder cards for future community cards */}
                  {Array.from({
                    length: 5 - gameState.communityCards.length,
                  }).map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="w-14 h-20 border-2 border-dashed border-emerald-600 rounded-lg opacity-30"
                    ></div>
                  ))}
                </div>
              </div>

              {/* Game Phase Indicator */}
              <div className="absolute top-14 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-emerald-600 text-white px-4 py-1 text-sm font-semibold">
                  {gameState.phase.charAt(0).toUpperCase() +
                    gameState.phase.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Players */}
            {gameState.players.map((player, index) => {
              const positions = [
                {
                  // Bottom center (You)
                  bottom: "-70px",
                  left: "50%",
                  transform: "translateX(-50%)",
                },
                {
                  // Left lower side
                  top: "60%",
                  left: "-200px",
                },
                {
                  // Left upper side
                  top: "20%",
                  left: "-200px",
                },
                {
                  // Top center
                  top: "-60px",
                  left: "50%",
                  transform: "translateX(-50%)",
                },
                {
                  // Right upper side
                  top: "20%",
                  right: "-200px",
                },
                {
                  // Right lower side
                  top: "60%",
                  right: "-200px",
                },
              ];
              const position = positions[index] || positions[0];

              const isCurrentPlayer = gameState.activePlayerIndex === index;
              const isYou = player.id === "player1";

              return (
                <div key={player.id} className="absolute" style={position}>
                  <div
                    className={`relative transition-all duration-300 ${
                      isCurrentPlayer ? "scale-110" : "scale-100"
                    }`}
                  >
                    {/* Player Info Card */}
                    <Card
                      className={`bg-slate-800 border-2 transition-all duration-300 relative overflow-hidden ${
                        isCurrentPlayer
                          ? "border-emerald-400 shadow-lg shadow-emerald-400/20"
                          : player.isFolded
                          ? "border-red-500 opacity-50"
                          : "border-slate-600"
                      }`}
                    >
                      <CardContent className="grid grid-cols-[auto_auto] gap-x-4 gap-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              {player.avatar && (
                                <AvatarImage
                                  src={player.avatar}
                                  alt={player.name}
                                />
                              )}
                              <AvatarFallback className="bg-emerald-600 text-white">
                                {player.name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Dealer Button */}
                            {player.isDealer && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-black">
                                D
                              </div>
                            )}
                            {/* Blind Indicators */}
                            {player.isSmallBlind && (
                              <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                                SB
                              </div>
                            )}
                            {player.isBigBlind && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                                BB
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {player.name}
                            </div>
                            <div className="text-xs text-emerald-400">
                              R$ {player.chips}
                            </div>
                            {player.currentBet > 0 && (
                              <div className="text-xs text-yellow-400">
                                Bet: R$ {player.currentBet}
                              </div>
                            )}
                            {player.action && (
                              <div className="text-xs text-slate-400 capitalize">
                                {player.action}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Player Cards */}
                        <div className="flex justify-center-safe gap-x-1">
                          {player.cards.map((card, cardIndex) => (
                            <PlayingCard
                              key={card.id}
                              card={card}
                              size="sm"
                              isVisible={
                                isYou || gameState.phase === "showdown"
                              }
                              isAnimating={isAnimating}
                              animationDelay={cardIndex * 100}
                            />
                          ))}
                        </div>

                        {/* Action Timer */}
                        {isCurrentPlayer &&
                          gameState.phase !== "waiting" &&
                          gameState.phase !== "showdown" && (
                            <div className="absolute left-0 right-0 bottom-0 h-1 bg-slate-700/70">
                              <div
                                key={`${gameState.handNumber}-${gameState.activePlayerIndex}-${gameState.phase}`}
                                className="turn-timer-fill h-full bg-yellow-500/80"
                                style={{
                                  // allow duration override if needed via CSS var
                                  // @ts-expect-error custom property
                                  "--turn-timer-duration": "30s",
                                }}
                              />
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Panel - Bottom Horizontal */}
        {isYourTurn &&
          gameState.phase !== "waiting" &&
          gameState.phase !== "showdown" && (
            <div className="fixed right-4 bottom-4 z-40 w-full max-w-md md:max-w-lg">
              <Card className="bg-slate-800 border-slate-600 shadow-2xl py-0">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {/* Row 1: Pre-set Bet Sizes */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                        onClick={() => {
                          handleRaiseInputChange(String(sliderMin));
                        }}
                      >
                        Min
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                        onClick={() => {
                          handleRaiseInputChange(
                            String(
                              Math.max(
                                minRaise,
                                Math.min(
                                  maxRaise,
                                  Math.floor(gameState.pot * 0.5)
                                )
                              )
                            )
                          );
                        }}
                      >
                        1/2 Pot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                        onClick={() => {
                          handleRaiseInputChange(
                            String(
                              Math.max(
                                minRaise,
                                Math.min(maxRaise, Math.floor(gameState.pot))
                              )
                            )
                          );
                        }}
                      >
                        Pot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                        onClick={() => {
                          handleRaiseInputChange(
                            String(
                              Math.max(
                                sliderMin,
                                Math.min(
                                  maxRaise,
                                  (currentPlayer?.chips || 0) +
                                    (currentPlayer?.currentBet || 0)
                                )
                              )
                            )
                          );
                        }}
                      >
                        Max
                      </Button>
                    </div>

                    {/* Row 2: Manual Bet Sizing Slider */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRaiseAmountChange(
                              -Math.max(1, gameState.bigBlind)
                            )
                          }
                          disabled={sliderValue <= sliderMin}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2"
                          aria-label="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={sliderValue}
                          onChange={(e) =>
                            handleRaiseInputChange(e.target.value)
                          }
                          min={sliderMin}
                          max={Math.max(sliderMin, maxRaise)}
                          step={Math.max(1, gameState.bigBlind)}
                          className="w-24 bg-slate-700 border-slate-600 text-white text-center no-spinners"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRaiseAmountChange(
                              Math.max(1, gameState.bigBlind)
                            )
                          }
                          disabled={sliderValue >= maxRaise}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2"
                          aria-label="Increase"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <input
                        type="range"
                        min={sliderMin}
                        max={Math.max(sliderMin, maxRaise)}
                        step={Math.max(1, gameState.bigBlind)}
                        value={sliderValue}
                        onChange={(e) => {
                          handleRaiseInputChange(e.target.value);
                        }}
                        className="flex-1 h-2 rounded-lg appearance-none bg-slate-700 accent-emerald-500"
                        disabled={maxRaise <= sliderMin}
                      />
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        Max R$ {maxRaise}
                      </span>
                    </div>

                    {/* Row 3: Decision Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Fold or Check Button */}
                      {canCheck ? (
                        <Button
                          variant="outline"
                          onClick={() => handlePlayerAction("check")}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent h-20 w-full text-base md:text-lg font-semibold"
                        >
                          Check
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          onClick={() => handlePlayerAction("fold")}
                          className="bg-red-600 hover:bg-red-700 h-20 w-full text-base md:text-lg font-semibold"
                        >
                          Fold
                        </Button>
                      )}

                      {/* Right Action Button: Call / Bet / Raise */}
                      {canCall ? (
                        sliderValue > sliderMin ? (
                          <Button
                            onClick={() =>
                              handlePlayerAction(
                                "raise",
                                Math.max(
                                  minRaise,
                                  Math.min(maxRaise, sliderValue)
                                )
                              )
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 h-20 w-full text-base md:text-lg font-semibold"
                            disabled={
                              sliderValue < minRaise || sliderValue > maxRaise
                            }
                          >
                            Raise to R${" "}
                            {Math.max(
                              minRaise,
                              Math.min(maxRaise, sliderValue)
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handlePlayerAction("call")}
                            className="bg-blue-600 hover:bg-blue-700 h-20 w-full text-base md:text-lg font-semibold"
                          >
                            Call R$ {callAmount}
                          </Button>
                        )
                      ) : (
                        <Button
                          onClick={() =>
                            handlePlayerAction(
                              "raise",
                              Math.max(
                                minRaise,
                                Math.min(maxRaise, sliderValue)
                              )
                            )
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 h-20 w-full text-base md:text-lg font-semibold"
                          disabled={
                            sliderValue < minRaise || sliderValue > maxRaise
                          }
                        >
                          {gameState.currentBet === 0 ? "Bet" : "Raise to"} R${" "}
                          {Math.max(minRaise, Math.min(maxRaise, sliderValue))}
                        </Button>
                      )}

                      {/* Only two primary buttons at the bottom */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
      </div>

      {/* Winner Dialog */}
      <Dialog open={showWinnerDialog} onOpenChange={setShowWinnerDialog}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-center">🎉 Hand Winner!</DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              {winner?.name} wins R$ {gameState.pot}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              {winner?.avatar && (
                <AvatarImage src={winner.avatar} alt={winner.name} />
              )}
              <AvatarFallback className="bg-emerald-600 text-white text-xl">
                {winner?.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold text-emerald-400">
              {winner?.name}
            </h3>
            <p className="text-slate-300">New balance: R$ {winner?.chips}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
