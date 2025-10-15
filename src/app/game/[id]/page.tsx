"use client";

import { DevOnly } from "@/components/dev/DevOnly";
import { DevToolsPanel } from "@/components/dev/DevToolsPanel";
import type { PlayingCard as IPlayingCard } from "@/lib/gameTypes";
import { evaluateBestHandDetailed } from "@/lib/poker/cards";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActionPanel } from "./_components/ActionPanel";
import { CommunityCards } from "./_components/CommunityCards";
import { Header } from "./_components/Header";
import { PlayerSeat } from "./_components/PlayerSeat";
import { ShowdownBanner } from "./_components/ShowdownBanner";
import { TableSurface } from "./_components/TableSurface";
import { useGameData } from "./_hooks/useGameData";

export default function PokerGamePage() {
  const { id } = useParams() as { id: string };
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [raiseAmount, setRaiseAmount] = useState<number>(0);

  const {
    dbGame,
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
    isActing,
    isJoining,
    isLeaving,
    isResetting,
  } = useGameData(id);

  useEffect(() => {
    // Reset baseline when turn or round changes
    if (!yourDbPlayer) return;
    const baseline = canCall ? callAmount : minRaiseTotal;
    setRaiseAmount(baseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dbGame?.currentPlayerTurn,
    dbGame?.currentRound,
    dbGame?.currentHighestBet,
    yourDbPlayer?.id,
    canCall,
    callAmount,
    minRaiseTotal,
  ]);

  const handleRaiseAmountChange = (delta: number) => {
    setRaiseAmount((prev) => {
      const next = Math.max(sliderMin, Math.min(maxRaiseTotal, prev + delta));
      return next;
    });
  };

  const handleRaiseInputChange = (value: string) => {
    const num = Number.parseInt(value) || 0;
    setRaiseAmount(Math.max(sliderMin, Math.min(maxRaiseTotal, num)));
  };

  const handlePlayerAction = async (
    action: "check" | "call" | "fold" | "raise" | "bet",
    totalAmount?: number
  ) => {
    await actions.act(action, totalAmount ?? raiseAmount);
  };

  const phase = dbGame?.currentRound ?? "pre-flop";
  const isShowdown = phase === "showdown";
  const showActionPanel: boolean = !!(
    isYourTurn &&
    dbGame &&
    dbGame.status === "active" &&
    phase !== "showdown"
  );

  const handleJoin = async () => actions.join();
  const handleLeave = async () => actions.leave();

  const handleReset = async () => actions.reset();

  const sliderMin = canCall ? callAmount : minRaiseTotal;
  const sliderValue = Math.max(sliderMin, Math.min(maxRaiseTotal, raiseAmount));

  // Compute SB/BB flags based on button position and number of active players
  const buttonIndex = playersBySeat.findIndex((p) => p.isButton);
  const activePlayers = playersBySeat.filter((p) => !p.hasFolded);
  const headsUp = activePlayers.length === 2;

  const getIsSB = (seatIndex: number) => {
    if (buttonIndex === -1) return false;
    if (headsUp) {
      // Heads-up: button is SB
      return playersBySeat[seatIndex]?.isButton ?? false;
    }
    return (
      playersBySeat[(buttonIndex + 1) % playersBySeat.length]?.id ===
      playersBySeat[seatIndex]?.id
    );
  };

  const getIsBB = (seatIndex: number) => {
    if (buttonIndex === -1) return false;
    if (headsUp) {
      // Heads-up: BB is the other active player
      const bbIndex = (buttonIndex + 1) % playersBySeat.length;
      return playersBySeat[bbIndex]?.id === playersBySeat[seatIndex]?.id;
    }
    return (
      playersBySeat[(buttonIndex + 2) % playersBySeat.length]?.id ===
      playersBySeat[seatIndex]?.id
    );
  };

  const turnDurationMs = Math.max(1000, Number(dbGame?.turnMs ?? 30000));

  // Compute highlight sets for showdown (winning cards only)
  const { boardHighlightIds, holeHighlightIds } = useMemo(() => {
    const empty = {
      boardHighlightIds: undefined as Set<string> | undefined,
      holeHighlightIds: new Map<string, Set<string>>(),
    };
    if (!isShowdown) return empty;

    // Contested showdown only if multiple active players
    const activePlayers = playersBySeat.filter((p) => !p.hasFolded);
    if (activePlayers.length <= 1) return empty;

    const communityDb = dbCards.filter((c) => c.playerId === null);
    if (communityDb.length < 3) return empty;

    // Build per-player ordered db cards (to mirror id generation used in UI)
    const perPlayerOrdered = new Map<string, { list: typeof dbCards }>();
    for (const c of dbCards) {
      if (!c.playerId) continue;
      const entry = perPlayerOrdered.get(c.playerId) ?? {
        list: [] as typeof dbCards,
      };
      entry.list.push(c);
      perPlayerOrdered.set(c.playerId, entry);
    }

    // Determine winners: prefer hasWon flags; otherwise compute among active players where hole cards are present
    let winners = playersBySeat.filter((p) => p.hasWon);
    if (winners.length === 0) {
      const candidates = activePlayers.filter(
        (p) => (perPlayerOrdered.get(p.id)?.list.length ?? 0) >= 2
      );
      const evals = candidates.map((p) => {
        const hole = (perPlayerOrdered.get(p.id)?.list ?? []).slice(0, 2);
        const ev = evaluateBestHandDetailed([...hole, ...communityDb]);
        return { player: p, ev };
      });
      const bestRank = Math.max(...evals.map((e) => e.ev.rank));
      const bestRanked = evals.filter((e) => e.ev.rank === bestRank);
      const bestValue = Math.max(...bestRanked.map((e) => e.ev.value));
      winners = bestRanked
        .filter((e) => e.ev.value === bestValue)
        .map((e) => e.player);
    }

    const boardSet = new Set<string>();
    const holeSets = new Map<string, Set<string>>();

    // Helper to map db community card to UI id
    const findCommunityId = (
      rank: IPlayingCard["rank"],
      suit: IPlayingCard["suit"]
    ): string | undefined => {
      const idx = communityCards.findIndex(
        (c) => c.rank === rank && c.suit === suit
      );
      return idx >= 0 ? communityCards[idx]!.id : undefined;
    };

    for (const w of winners) {
      const playerCardsDb = (perPlayerOrdered.get(w.id)?.list ?? []).slice(
        0,
        2
      );
      if (playerCardsDb.length < 2) continue;
      try {
        const detailed = evaluateBestHandDetailed([
          ...playerCardsDb,
          ...communityDb,
        ]);
        // Board cards used
        detailed.used
          .filter((c) => c.playerId === null)
          .forEach((c) => {
            const cid = findCommunityId(c.rank, c.suit);
            if (cid) boardSet.add(cid);
          });
        // Hole cards used
        const holeUsed = detailed.used.filter((c) => c.playerId === w.id);
        if (holeUsed.length > 0) {
          const set = holeSets.get(w.id) ?? new Set<string>();
          for (const hc of holeUsed) {
            const ordered = perPlayerOrdered.get(w.id)?.list ?? [];
            const index = ordered.findIndex(
              (x) => x.rank === hc.rank && x.suit === hc.suit
            );
            if (index >= 0) {
              const id = `${hc.rank}-${hc.suit}-${w.id}-${index}`;
              set.add(id);
            }
          }
          holeSets.set(w.id, set);
        }
      } catch {}
    }

    return {
      boardHighlightIds: boardSet.size > 0 ? boardSet : undefined,
      holeHighlightIds: holeSets,
    };
  }, [isShowdown, playersBySeat, dbCards, communityCards]);

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
        canReset={!!dbGame}
        onResetAction={handleReset}
        isJoining={isJoining}
        isLeaving={isLeaving}
        isResetting={isResetting}
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
            <ShowdownBanner
              game={dbGame}
              players={playersBySeat}
              cards={dbCards}
            />
            <CommunityCards
              cards={communityCards}
              isAnimating={false}
              highlightIds={boardHighlightIds}
            />

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

              const seatIndex = playersBySeat.findIndex(
                (p) => p.id === player.id
              );
              return (
                <PlayerSeat
                  key={player.id}
                  player={player}
                  isCurrent={isCurrentPlayer}
                  isYou={isYou}
                  phase={phase}
                  cards={playerCards}
                  highlightIds={holeHighlightIds.get(player.id)}
                  positionStyle={position}
                  activeKey={`${dbGame?.id}-${activePlayerIndex}-${phase}`}
                  isSmallBlind={getIsSB(seatIndex)}
                  isBigBlind={getIsBB(seatIndex)}
                  turnDurationMs={turnDurationMs}
                  gameId={String(id)}
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
          isActing={isActing}
          onChangeAmountAction={(v) => handleRaiseInputChange(v)}
          onDeltaAction={(d) => handleRaiseAmountChange(d)}
          onCheckAction={() => handlePlayerAction("check")}
          onFoldAction={() => handlePlayerAction("fold")}
          onCallAction={() => handlePlayerAction("call")}
          onRaiseToAction={(total) => handlePlayerAction("raise", total)}
        />
      </div>

      {/* Winner dialog removed in server-driven version */}

      {/* Dev panels container (UI-only gating from backend role) */}
      <DevOnly>
        <div className="fixed top-20 right-4 z-50">
          <DevToolsPanel
            tableId={id}
            game={dbGame}
            players={playersBySeat}
            currentPlayerId={dbGame?.currentPlayerTurn ?? undefined}
            floating={false}
          />
        </div>
      </DevOnly>
    </div>
  );
}
