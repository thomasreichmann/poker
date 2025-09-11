"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

type ActionPanelProps = {
  visible: boolean;
  minRaiseTotal: number;
  maxRaiseTotal: number;
  callAmount: number;
  bigBlind: number;
  pot: number;
  sliderValue: number;
  sliderMin: number;
  canCheck: boolean;
  canCall: boolean;
  currentHighestBet: number;
  isActing?: boolean;
  onChangeAmountAction: (value: string) => void;
  onDeltaAction: (delta: number) => void;
  onCheckAction: () => void;
  onFoldAction: () => void;
  onCallAction: () => void;
  onRaiseToAction: (total: number) => void;
};

export function ActionPanel({
  visible,
  minRaiseTotal,
  maxRaiseTotal,
  callAmount,
  bigBlind,
  pot,
  sliderValue,
  sliderMin,
  canCheck,
  canCall,
  currentHighestBet,
  isActing = false,
  onChangeAmountAction,
  onDeltaAction,
  onCheckAction,
  onFoldAction,
  onCallAction,
  onRaiseToAction,
}: ActionPanelProps) {
  const [loadingAction, setLoadingAction] = useState<
    "check" | "fold" | "call" | "raise" | null
  >(null);
  const anyLoading = isActing || loadingAction !== null;

  if (!visible) return null;

  const handleCheck = async () => {
    if (anyLoading) return;
    setLoadingAction("check");
    try {
      await onCheckAction();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFold = async () => {
    if (anyLoading) return;
    setLoadingAction("fold");
    try {
      await onFoldAction();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCall = async () => {
    if (anyLoading) return;
    setLoadingAction("call");
    try {
      await onCallAction();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRaiseTo = async () => {
    if (anyLoading) return;
    setLoadingAction("raise");
    try {
      await onRaiseToAction(
        Math.max(minRaiseTotal, Math.min(maxRaiseTotal, sliderValue))
      );
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-40 w-full max-w-md md:max-w-lg">
      <Card className="bg-slate-800 border-slate-600 shadow-2xl py-0">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                onClick={() => onChangeAmountAction(String(sliderMin))}
                disabled={anyLoading}
              >
                Mín
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                onClick={() =>
                  onChangeAmountAction(
                    String(
                      Math.max(
                        minRaiseTotal,
                        Math.min(maxRaiseTotal, Math.floor((pot || 0) * 0.5))
                      )
                    )
                  )
                }
                disabled={anyLoading}
              >
                1/2 Pote
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                onClick={() =>
                  onChangeAmountAction(
                    String(
                      Math.max(
                        minRaiseTotal,
                        Math.min(maxRaiseTotal, Math.floor(pot || 0))
                      )
                    )
                  )
                }
                disabled={anyLoading}
              >
                Pote
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                onClick={() =>
                  onChangeAmountAction(
                    String(
                      Math.max(
                        sliderMin,
                        Math.min(maxRaiseTotal, maxRaiseTotal)
                      )
                    )
                  )
                }
                disabled={anyLoading}
              >
                Máx
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeltaAction(-Math.max(1, bigBlind ?? 1))}
                  disabled={anyLoading || sliderValue <= sliderMin}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2"
                  aria-label="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={sliderValue}
                  onChange={(e) => onChangeAmountAction(e.target.value)}
                  min={sliderMin}
                  max={Math.max(sliderMin, maxRaiseTotal)}
                  step={Math.max(1, bigBlind ?? 1)}
                  className="w-24 bg-slate-700 border-slate-600 text-white text-center no-spinners"
                  disabled={anyLoading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeltaAction(Math.max(1, bigBlind ?? 1))}
                  disabled={anyLoading || sliderValue >= maxRaiseTotal}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2"
                  aria-label="Increase"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <input
                type="range"
                min={sliderMin}
                max={Math.max(sliderMin, maxRaiseTotal)}
                step={Math.max(1, bigBlind ?? 1)}
                value={sliderValue}
                onChange={(e) => onChangeAmountAction(e.target.value)}
                className="flex-1 h-2 rounded-lg appearance-none bg-slate-700 accent-emerald-500"
                disabled={anyLoading || maxRaiseTotal <= sliderMin}
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Máx R$ {maxRaiseTotal}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {canCheck ? (
                <Button
                  variant="outline"
                  onClick={handleCheck}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent h-20 w-full text-base md:text-lg font-semibold"
                  isLoading={loadingAction === "check"}
                  loadingText="Processando..."
                  disabled={anyLoading}
                >
                  Check
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleFold}
                  className="bg-red-600 hover:bg-red-700 h-20 w-full text-base md:text-lg font-semibold"
                  isLoading={loadingAction === "fold"}
                  loadingText="Processando..."
                  disabled={anyLoading}
                >
                  Fold
                </Button>
              )}

              {canCall ? (
                sliderValue > sliderMin ? (
                  <Button
                    onClick={handleRaiseTo}
                    className="bg-emerald-600 hover:bg-emerald-700 h-20 w-full text-base md:text-lg font-semibold"
                    isLoading={loadingAction === "raise"}
                    loadingText="Executando..."
                    disabled={
                      anyLoading ||
                      sliderValue < minRaiseTotal ||
                      sliderValue > maxRaiseTotal
                    }
                  >
                    Aumentar para R${" "}
                    {Math.max(
                      minRaiseTotal,
                      Math.min(maxRaiseTotal, sliderValue)
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCall}
                    className="bg-blue-600 hover:bg-blue-700 h-20 w-full text-base md:text-lg font-semibold"
                    isLoading={loadingAction === "call"}
                    loadingText="Executando..."
                    disabled={anyLoading}
                  >
                    <>Pagar R$ {callAmount}</>
                  </Button>
                )
              ) : (
                <Button
                  onClick={handleRaiseTo}
                  className="bg-emerald-600 hover:bg-emerald-700 h-20 w-full text-base md:text-lg font-semibold"
                  isLoading={loadingAction === "raise"}
                  loadingText="Executando..."
                  disabled={
                    anyLoading ||
                    sliderValue < minRaiseTotal ||
                    sliderValue > maxRaiseTotal
                  }
                >
                  {currentHighestBet === 0 ? "Apostar" : "Aumentar para"} R${" "}
                  {Math.max(
                    minRaiseTotal,
                    Math.min(maxRaiseTotal, sliderValue)
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
