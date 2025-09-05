"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  RotateCcw,
  Settings,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type HeaderProps = {
  tableId: string;
  smallBlind: number;
  bigBlind: number;
  phaseLabel: string;
  connectedCount: number;
  totalPlayers: number;
  soundEnabled: boolean;
  onToggleSoundAction: () => void;
  canJoin: boolean;
  onJoinAction: () => void;
  canLeave?: boolean;
  onLeaveAction?: () => Promise<void> | void;
  canReset?: boolean;
  onResetAction?: () => Promise<void> | void;
};

export function Header({
  tableId,
  smallBlind,
  bigBlind,
  phaseLabel,
  connectedCount,
  totalPlayers,
  soundEnabled,
  onToggleSoundAction,
  canJoin,
  onJoinAction,
  canLeave = false,
  onLeaveAction,
  canReset = false,
  onResetAction,
}: HeaderProps) {
  const router = useRouter();
  return (
    <header className="absolute top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white flex items-center space-x-2"
            onClick={() => router.push("/dashboard")}
          >
            <span>Início</span>
          </Button>
          {canLeave ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white flex items-center space-x-2"
              onClick={async () => {
                try {
                  await onLeaveAction?.();
                } finally {
                  router.push("/dashboard");
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Sair da Mesa</span>
            </Button>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Link>
          )}
          <div className="text-sm text-slate-400">
            Mesa {String(tableId).slice(0, 8)} • R$ {smallBlind}/{bigBlind}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span>{phaseLabel}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Users className="h-4 w-4 text-blue-400" />
            <span>
              {connectedCount}/{totalPlayers}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSoundAction}
            className="text-slate-400 hover:text-white"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
            asChild
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700 text-slate-200">
                <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {process.env.NODE_ENV !== "production" && canReset && (
                  <>
                    <DropdownMenuLabel>Developer</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => onResetAction?.()}
                      className="text-amber-300 focus:text-amber-200"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset game
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </Button>
          {canJoin && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={onJoinAction}
            >
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
