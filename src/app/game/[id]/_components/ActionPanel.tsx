"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

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
  onChangeAmountAction,
  onDeltaAction,
  onCheckAction,
  onFoldAction,
  onCallAction,
  onRaiseToAction,
}: ActionPanelProps) {
  if (!visible) return null;

  return (
    <div className="fixed left-2 right-2 bottom-2 md:left-auto md:right-4 md:bottom-4 z-50 w-auto md:w-full md:max-w-lg">
      <Card className="bg-slate-800 border-slate-600 shadow-2xl py-0">
        <CardContent className="p-2 md:p-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent px-2 py-1 text-xs flex-grow"
                onClick={() => onChangeAmountAction(String(sliderMin))}
              >
                Min
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
              >
                1/2 Pot
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
              >
                Pot
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
              >
                Max
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeltaAction(-Math.max(1, bigBlind ?? 1))}
                  disabled={sliderValue <= sliderMin}
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
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeltaAction(Math.max(1, bigBlind ?? 1))}
                  disabled={sliderValue >= maxRaiseTotal}
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
                disabled={maxRaiseTotal <= sliderMin}
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Max R$ {maxRaiseTotal}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {canCheck ? (
                <Button
                  variant="outline"
                  onClick={onCheckAction}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent h-20 w-full text-base md:text-lg font-semibold"
                >
                  Check
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={onFoldAction}
                  className="bg-red-600 hover:bg-red-700 h-20 w-full text-base md:text-lg font-semibold"
                >
                  Fold
                </Button>
              )}

              {canCall ? (
                sliderValue > sliderMin ? (
                  <Button
                    onClick={() =>
                      onRaiseToAction(
                        Math.max(
                          minRaiseTotal,
                          Math.min(maxRaiseTotal, sliderValue)
                        )
                      )
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 h-20 w-full text-base md:text-lg font-semibold"
                    disabled={
                      sliderValue < minRaiseTotal || sliderValue > maxRaiseTotal
                    }
                  >
                    Raise to R${" "}
                    {Math.max(
                      minRaiseTotal,
                      Math.min(maxRaiseTotal, sliderValue)
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={onCallAction}
                    className="bg-blue-600 hover:bg-blue-700 h-20 w-full text-base md:text-lg font-semibold"
                  >
                    Call R$ {callAmount}
                  </Button>
                )
              ) : (
                <Button
                  onClick={() =>
                    onRaiseToAction(
                      Math.max(
                        minRaiseTotal,
                        Math.min(maxRaiseTotal, sliderValue)
                      )
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 h-20 w-full text-base md:text-lg font-semibold"
                  disabled={
                    sliderValue < minRaiseTotal || sliderValue > maxRaiseTotal
                  }
                >
                  {currentHighestBet === 0 ? "Bet" : "Raise to"} R${" "}
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
