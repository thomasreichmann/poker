"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMotion } from "@/lib/motion/provider";
import type { MotionPreset } from "@/lib/motion/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Eye, Play, RefreshCw } from "lucide-react";
import { useState } from "react";

type AnimationsPanelProps = {
  floating?: boolean;
  embedded?: boolean;
};

export function AnimationsPanel({
  floating = true,
  embedded = false,
}: AnimationsPanelProps) {
  const {
    settings,
    toggleEnabled,
    setDebugOutlines,
    setSpeedMultiplier,
    setPreset,
    events,
    clearEvents,
    emit,
  } = useMotion();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const body = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">Enabled</label>
          <Button
            onClick={toggleEnabled}
            className={cn(
              "w-full",
              settings.enabled
                ? "bg-emerald-600"
                : "bg-slate-700 border-slate-600"
            )}
            variant={settings.enabled ? "default" : "outline"}
          >
            {settings.enabled ? "On" : "Off"}
          </Button>
        </div>
        <div>
          <label className="text-xs">Debug outlines</label>
          <Button
            onClick={() => setDebugOutlines(!settings.debugOutlines)}
            className={cn(
              "w-full",
              settings.debugOutlines
                ? "bg-yellow-600"
                : "bg-slate-700 border-slate-600"
            )}
            variant={settings.debugOutlines ? "default" : "outline"}
          >
            {settings.debugOutlines ? "Shown" : "Hidden"}
          </Button>
        </div>
      </div>

      <div>
        <label className="text-xs">Speed multiplier</label>
        <Input
          type="number"
          min={0.25}
          step={0.25}
          value={settings.speedMultiplier}
          onChange={(e) => setSpeedMultiplier(Number(e.target.value) || 1)}
          className="bg-slate-700 border-slate-600 text-xs"
        />
      </div>

      <div>
        <label className="text-xs">Preset</label>
        <Select
          value={settings.preset}
          onValueChange={(v: MotionPreset) => setPreset(v)}
        >
          <SelectTrigger className="bg-slate-700 border-slate-600">
            <SelectValue placeholder="preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">default</SelectItem>
            <SelectItem value="none">none</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => emit("demo:flip")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-3 w-3 mr-1" /> Demo flip
          </Button>
          <Button
            onClick={() => emit("community:reveal")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Reveal community
          </Button>
          <Button
            onClick={() => emit("seat:turn", { playerId: "you" })}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Seat turn (you)
          </Button>
          <Button
            onClick={() => emit("seat:fold", { playerId: "you" })}
            className="bg-red-600 hover:bg-red-700"
          >
            Seat fold (you)
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={clearEvents}
            variant="outline"
            className="flex-1 bg-slate-700 border-slate-600"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Clear log
          </Button>
        </div>
      </div>

      <div className="max-h-40 overflow-auto border border-slate-700 rounded p-2 text-[10px] text-slate-300 bg-slate-900/40">
        {events.length === 0 ? (
          <div className="text-slate-500">No events</div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="flex items-center justify-between">
              <div className="truncate max-w-[70%]">{e.name}</div>
              <div className="text-slate-500">
                {new Date(e.at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Animations</div>
          <div className="flex items-center gap-2">
            <Button
              variant={settings.enabled ? "default" : "outline"}
              size="sm"
              onClick={toggleEnabled}
              className={
                settings.enabled
                  ? "bg-emerald-600 border-emerald-600"
                  : "bg-slate-700 border-slate-600 text-white"
              }
            >
              {settings.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
        {body}
      </div>
    );
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
            <Eye className="h-4 w-4" />
            <CardTitle className="text-sm">Animations</CardTitle>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              variant={settings.enabled ? "default" : "outline"}
              size="sm"
              onClick={toggleEnabled}
              className={
                settings.enabled
                  ? "bg-emerald-600 border-emerald-600"
                  : "bg-slate-700 border-slate-600 text-white"
              }
            >
              {settings.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && <CardContent className="space-y-3">{body}</CardContent>}
    </Card>
  );
}
