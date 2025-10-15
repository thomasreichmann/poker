"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Game } from "@/db/schema/games";
import { Player } from "@/db/schema/players";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
// no hooks needed here beyond local storage state
import { BoardPanel } from "./BoardPanel";
import { MultiPlayerTestPanel } from "./MultiPlayerTestPanel";
import RealtimePanel from "./RealtimePanel";
import { SimulatorPanel } from "./SimulatorPanel";

type DevToolsPanelProps = {
  tableId: string;
  game: Game | null;
  players: Player[];
  currentPlayerId?: string;
  floating?: boolean;
  className?: string;
};

export function DevToolsPanel({
  tableId,
  game,
  players,
  currentPlayerId,
  floating = false,
  className,
}: DevToolsPanelProps) {
  const tabStorageKey = `dev.panel.tab`;
  const openStorageKey = `dev.panel.open`;
  const [open, setOpen] = useLocalStorageState<boolean>(openStorageKey, false);
  const [tab, setTab] = useLocalStorageState<string>(tabStorageKey, "multi");
  return (
    <Card
      className={cn(
        "w-[440px] bg-slate-800 border-slate-700 text-white shadow-xl z-50 overflow-hidden py-0 pt-2 gap-0",
        floating && "fixed top-20 right-4",
        className
      )}
    >
      <CardHeader className={cn(open ? "px-3 py-2" : "px-3 py-1")}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Developer Tools</CardTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded bg-slate-700/60 border border-slate-600 text-slate-200 hover:bg-slate-600 transition-colors"
              )}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  open ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>
          </div>
        </div>
      </CardHeader>
      <div
        className={cn(
          "transition-all duration-300 overflow-auto",
          open ? "max-h-[60vh] opacity-100" : "max-h-0 opacity-0 p-0 m-0"
        )}
        aria-hidden={!open}
      >
        <CardContent className={cn(open ? "p-3" : "p-0")}>
          <Tabs
            value={tab === "sim" ? "multi" : tab}
            onValueChange={(v) => {
              if (v !== "sim") setTab(v);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-slate-900 border border-slate-700">
              <TabsTrigger
                value="multi"
                className="data-[state=active]:bg-slate-700"
              >
                Multi-player
              </TabsTrigger>
              <TabsTrigger
                value="sim"
                disabled
                className="data-[state=active]:bg-slate-700"
              >
                Simulator
              </TabsTrigger>
              <TabsTrigger
                value="board"
                className="data-[state=active]:bg-slate-700"
              >
                Board
              </TabsTrigger>
              <TabsTrigger
                value="realtime"
                className="data-[state=active]:bg-slate-700"
              >
                Realtime
              </TabsTrigger>
            </TabsList>
            <TabsContent value="multi" className="pt-3">
              <MultiPlayerTestPanel
                gameId={tableId}
                game={game}
                players={players}
                currentPlayerId={currentPlayerId}
                floating={false}
                embedded
                disableToasts
              />
            </TabsContent>
            <TabsContent value="sim" className="pt-3">
              <SimulatorPanel
                tableId={tableId}
                players={players.map((p) => ({
                  id: p.id,
                  displayName: p.displayName,
                }))}
                floating={false}
                embedded
              />
            </TabsContent>
            <TabsContent value="board" className="pt-3">
              <BoardPanel embedded />
            </TabsContent>
            <TabsContent value="realtime" className="pt-3">
              <RealtimePanel gameId={tableId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </div>
    </Card>
  );
}
