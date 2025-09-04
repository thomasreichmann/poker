"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dealFlop,
  dealRiver,
  dealTurn,
  enableBoardOverride,
  resetBoard,
  simulateFullBoard,
  useBoardState,
} from "@/lib/dev/board";

export function BoardPanel({ embedded = false }: { embedded?: boolean }) {
  const board = useBoardState();
  const body = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-center">
        <Button
          size="sm"
          variant={board.enabled ? "default" : "outline"}
          onClick={() => enableBoardOverride(!board.enabled)}
          className={
            board.enabled
              ? "bg-emerald-600 border-emerald-600"
              : "bg-slate-700 border-slate-600"
          }
        >
          {board.enabled ? "Override: On" : "Override: Off"}
        </Button>
        <Button
          size="sm"
          onClick={dealFlop}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Deal Flop
        </Button>
        <Button
          size="sm"
          onClick={dealTurn}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Deal Turn
        </Button>
        <Button
          size="sm"
          onClick={dealRiver}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Deal River
        </Button>
        <Button
          size="sm"
          onClick={resetBoard}
          variant="outline"
          className="bg-slate-700 border-slate-600"
        >
          Clear Cards
        </Button>
        <Button
          size="sm"
          onClick={simulateFullBoard}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          Simulate Full Board
        </Button>
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <Card className="w-96 bg-slate-800 border-slate-700 text-white shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Board Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{body}</CardContent>
    </Card>
  );
}
