"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDevAccess } from "@/hooks/useDevAccess";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Pause, Play, Settings } from "lucide-react";
import { useEffect, useState } from "react";

const STRATEGIES = [
  { id: "always_fold", label: "Always Fold" },
  { id: "call_any", label: "Call Any" },
  { id: "tight_aggro", label: "Tight Aggro" },
  { id: "loose_passive", label: "Loose Passive" },
  { id: "scripted", label: "Scripted" },
] as const;

type StrategyId = typeof STRATEGIES[number]["id"];

type SimulatorPanelProps = {
  tableId: string;
  playerIds: string[];
};

export function SimulatorPanel({ tableId, playerIds }: SimulatorPanelProps) {
  const { canShowDevFeatures } = useDevAccess();
  const trpc = useTRPC();

  const enableMutation = useMutation(trpc.simulator.enable.mutationOptions());
  const updateMutation = useMutation(
    trpc.simulator.updateConfig.mutationOptions()
  );
  const pauseMutation = useMutation(trpc.simulator.pause.mutationOptions());
  const resumeMutation = useMutation(trpc.simulator.resume.mutationOptions());

  const [enabled, setEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seed, setSeed] = useState("");
  const [minDelay, setMinDelay] = useState(200);
  const [maxDelay, setMaxDelay] = useState(800);
  const [defaultStrategy, setDefaultStrategy] = useState<StrategyId>("call_any");
  const [perSeat, setPerSeat] = useState<Record<string, StrategyId | "">>({});

  useEffect(() => {
    const init: Record<string, StrategyId | ""> = {};
    for (const id of playerIds) init[id] = "";
    setPerSeat(init);
  }, [playerIds]);

  if (!canShowDevFeatures) return null;

  const onToggleEnable = async () => {
    if (!enabled) {
      await enableMutation.mutateAsync({
        tableId,
        config: {
          enabled: true,
          delays: { minMs: minDelay, maxMs: maxDelay },
          defaultStrategy: { id: defaultStrategy },
          perSeatStrategy: Object.fromEntries(
            Object.entries(perSeat)
              .filter(([, v]) => !!v)
              .map(([k, v]) => [k, { id: v as StrategyId }])
          ),
          seed: seed || undefined,
        },
      });
      setEnabled(true);
    } else {
      await updateMutation.mutateAsync({
        tableId,
        config: { enabled: false },
      });
      setEnabled(false);
    }
  };

  const onApply = async () => {
    await updateMutation.mutateAsync({
      tableId,
      config: {
        delays: { minMs: minDelay, maxMs: maxDelay },
        defaultStrategy: { id: defaultStrategy },
        perSeatStrategy: Object.fromEntries(
          Object.entries(perSeat)
            .filter(([, v]) => !!v)
            .map(([k, v]) => [k, { id: v as StrategyId }])
        ),
        seed: seed || undefined,
      },
    });
  };

  const onPauseResume = async () => {
    if (!paused) {
      await pauseMutation.mutateAsync({ tableId });
      setPaused(true);
    } else {
      await resumeMutation.mutateAsync({ tableId });
      setPaused(false);
    }
  };

  return (
    <Card className="fixed top-20 right-4 w-96 bg-slate-800 border-slate-700 text-white shadow-xl z-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <CardTitle className="text-sm">Simulator</CardTitle>
          </div>
          <Button
            variant={enabled ? "default" : "outline"}
            size="sm"
            onClick={onToggleEnable}
            className={enabled ? "bg-emerald-600 border-emerald-600" : "bg-slate-700 border-slate-600 text-white"}
          >
            {enabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs">Min delay (ms)</label>
            <Input
              type="number"
              value={minDelay}
              onChange={(e) => setMinDelay(Number(e.target.value) || 0)}
              className="bg-slate-700 border-slate-600 text-xs"
            />
          </div>
          <div>
            <label className="text-xs">Max delay (ms)</label>
            <Input
              type="number"
              value={maxDelay}
              onChange={(e) => setMaxDelay(Number(e.target.value) || 0)}
              className="bg-slate-700 border-slate-600 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="text-xs">Seed</label>
          <Input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="optional"
            className="bg-slate-700 border-slate-600 text-xs"
          />
        </div>

        <div>
          <label className="text-xs">Default strategy</label>
          <Select
            value={defaultStrategy}
            onValueChange={(v: StrategyId) => setDefaultStrategy(v)}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent>
              {STRATEGIES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-xs">Per-seat overrides</div>
          {playerIds.map((pid) => (
            <div key={pid} className="grid grid-cols-2 gap-2 items-center">
              <div className="truncate text-[10px] text-slate-400">{pid}</div>
              <Select
                value={perSeat[pid] || ""}
                onValueChange={(v: StrategyId | "") => setPerSeat((prev) => ({ ...prev, [pid]: v }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="inherit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">inherit</SelectItem>
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={onApply} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Apply
          </Button>
          <Button onClick={onPauseResume} variant="outline" className="flex-1 bg-slate-700 border-slate-600">
            {paused ? (
              <>
                <Play className="h-3 w-3 mr-1" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 mr-1" /> Pause
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}