"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Game } from "@/db/schema/games";
import { Player } from "@/db/schema/players";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { MultiPlayerTestPanel } from "./MultiPlayerTestPanel";
import { SimulatorPanel } from "./SimulatorPanel";
// Animations panel removed with motion provider refactor

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
  const [open, setOpen] = useState(true);
  return (
    <Card
      className={cn(
        "w-[440px] bg-slate-800 border-slate-700 text-white shadow-xl z-50 overflow-hidden",
        floating && "fixed top-20 right-4",
        className
      )}
    >
      <CardHeader className={cn(open ? "px-3 py-2" : "px-3 py-1")}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Developer Tools</CardTitle>
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
      </CardHeader>
      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0 p-0 m-0"
        )}
        aria-hidden={!open}
      >
        <CardContent className={cn(open ? "p-3" : "p-0")}>
          <Tabs defaultValue="sim" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-700">
              <TabsTrigger
                value="sim"
                className="data-[state=active]:bg-slate-700"
              >
                Simulator
              </TabsTrigger>
              <TabsTrigger
                value="multi"
                className="data-[state=active]:bg-slate-700"
              >
                Multi-player
              </TabsTrigger>
              {/* Animations tab removed */}
            </TabsList>
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
            <TabsContent value="multi" className="pt-3">
              <MultiPlayerTestPanel
                gameId={tableId}
                game={game}
                players={players}
                currentPlayerId={currentPlayerId}
                floating={false}
                embedded
              />
            </TabsContent>
            {/* Animations content removed */}
          </Tabs>
        </CardContent>
      </div>
    </Card>
  );
}
