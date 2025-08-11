"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionPanel } from "./_components/ActionPanel";
import { CommunityCards } from "./_components/CommunityCards";
import { Header } from "./_components/Header";
import { PlayerSeat } from "./_components/PlayerSeat";
import { TableSurface } from "./_components/TableSurface";
import { useGameData } from "./_hooks/useGameData";

export default function PokerGamePage() {
  const { id } = useParams() as { id: string };
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [raiseAmount, setRaiseAmount] = useState<number>(0);

  const {
    dbGame,
    dbPlayers,
    dbCards,
    yourDbPlayer,
    isYourTurn,
    communityCards,
    playersBySeat,
    playersByView,
    activePlayerIndex,
    activePlayerIndexByView,
    phaseLabel,
    callAmount,
    minRaiseTotal,
    maxRaiseTotal,
    canCheck,
    canCall,
    connectedCount,
    playerIdToCards,
    actions,
  } = useGameData(id);

  useEffect(() => {
    // Reset baseline when turn or round changes
    const tableBet = dbGame?.currentHighestBet ?? 0;
    if (!yourDbPlayer) return;
    const baseline = tableBet > 0 ? callAmount : minRaiseTotal;
    setRaiseAmount(baseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dbGame?.currentPlayerTurn,
    dbGame?.currentRound,
    dbGame?.currentHighestBet,
    yourDbPlayer?.id,
  ]);

  const handleRaiseAmountChange = (delta: number) => {
    setRaiseAmount((prev) => {
      const next = Math.max(
        minRaiseTotal,
        Math.min(maxRaiseTotal, prev + delta)
      );
      return next;
    });
  };

  const handleRaiseInputChange = (value: string) => {
    const num = Number.parseInt(value) || 0;
    setRaiseAmount(Math.max(minRaiseTotal, Math.min(maxRaiseTotal, num)));
  };

  const handlePlayerAction = async (
    action: "check" | "call" | "fold" | "raise" | "bet",
    totalAmount?: number
  ) => {
    await actions.act(action, totalAmount ?? raiseAmount);
  };

  const isAnimating = false;
  const phase = dbGame?.currentRound ?? "pre-flop";
  const showActionPanel: boolean = !!(
    isYourTurn &&
    dbGame &&
    dbGame.status === "active" &&
    phase !== "showdown"
  );

  const handleJoin = async () => actions.join();
  const handleLeave = async () => actions.leave();

  const handleAdvance = async () => actions.advance();

  const handleReset = async () => actions.reset();

  const sliderMin =
    (dbGame?.currentHighestBet ?? 0) > 0 ? callAmount : minRaiseTotal;
  const sliderValue = Math.max(sliderMin, Math.min(maxRaiseTotal, raiseAmount));

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      <Header
        tableId={String(id)}
        smallBlind={dbGame?.smallBlind ?? 0}
        bigBlind={dbGame?.bigBlind ?? 0}
        phaseLabel={phaseLabel}
        connectedCount={connectedCount}
        totalPlayers={playersBySeat.length}
        soundEnabled={soundEnabled}
        onToggleSoundAction={() => setSoundEnabled((v) => !v)}
        canJoin={!yourDbPlayer && !!dbGame}
        onJoinAction={handleJoin}
        canLeave={!!yourDbPlayer}
        onLeaveAction={handleLeave}
      />

      {/* Poker Table */}
      <div className="relative w-full h-screen pt-16 flex">
        {/* Main Table Area */}
        <div className="flex-1 flex items-center justify-center mb-56">
          <div className="relative">
            <TableSurface
              pot={dbGame?.pot ?? 0}
              currentHighestBet={dbGame?.currentHighestBet ?? 0}
              phaseLabel={phaseLabel}
            />
            <CommunityCards cards={communityCards as any} isAnimating={false} />

            {/* Players */}
            {playersByView.map((player, index) => {
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

              const isCurrentPlayer = activePlayerIndexByView === index;
              const isYou = player.id === yourDbPlayer?.id;
              const playerCards = playerIdToCards.get(player.id) ?? [];

              return (
                <PlayerSeat
                  key={player.id}
                  player={player}
                  isCurrent={isCurrentPlayer}
                  isYou={isYou}
                  phase={phase}
                  cards={playerCards as any}
                  positionStyle={position as any}
                  activeKey={`${dbGame?.id}-${activePlayerIndex}-${phase}`}
                />
              );
            })}
          </div>
        </div>

        <ActionPanel
          visible={showActionPanel}
          minRaiseTotal={minRaiseTotal}
          maxRaiseTotal={maxRaiseTotal}
          callAmount={callAmount}
          bigBlind={dbGame?.bigBlind ?? 1}
          pot={dbGame?.pot ?? 0}
          sliderValue={sliderValue}
          sliderMin={sliderMin}
          canCheck={canCheck}
          canCall={canCall}
          currentHighestBet={dbGame?.currentHighestBet ?? 0}
          onChangeAmountAction={(v) => handleRaiseInputChange(v)}
          onDeltaAction={(d) => handleRaiseAmountChange(d)}
          onCheckAction={() => handlePlayerAction("check")}
          onFoldAction={() => handlePlayerAction("fold")}
          onCallAction={() => handlePlayerAction("call")}
          onRaiseToAction={(total) => handlePlayerAction("raise", total)}
        />
      </div>

      {/* Winner dialog removed in server-driven version */}
    </div>
  );
}
