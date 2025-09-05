"use client";

import { Badge } from "@/components/ui/badge";

type TableSurfaceProps = {
  pot: number;
  currentHighestBet: number;
  phaseLabel: string;
};

export function TableSurface({
  pot,
  currentHighestBet,
  phaseLabel,
}: TableSurfaceProps) {
  return (
    <div className="relative">
      <div className="w-[800px] h-[500px] bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-full border-8 border-amber-950 shadow-2xl relative">
        <div className="absolute inset-4 bg-emerald-700 rounded-full opacity-30" />

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
                  Pote
                </div>
                <div className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  R$ {pot}
                </div>
              </div>
              {currentHighestBet > 0 && (
                <div className="ml-1 text-xs text-amber-200/90 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 whitespace-nowrap">
                  Aposta Atual: R$ {currentHighestBet}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-14 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-emerald-600 text-white px-4 py-1 text-sm font-semibold">
            {phaseLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
