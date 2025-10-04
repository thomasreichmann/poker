"use client";

import { useToast } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

export function useGameActions() {
  const trpc = useTRPC();
  const { toast } = useToast();

  const joinMutation = useMutation(trpc.game.join.mutationOptions());
  const actMutation = useMutation(trpc.game.act.mutationOptions());
  const advanceMutation = useMutation(trpc.game.advance.mutationOptions());
  const resetMutation = useMutation(trpc.game.reset.mutationOptions());
  const leaveMutation = useMutation(trpc.game.leave.mutationOptions());
  const timeoutMutation = useMutation(trpc.game.timeout.mutationOptions());

  const showError = (message: string) => {
    toast({ variant: "destructive", description: message });
  };

  return {
    mutations: {
      joinMutation,
      actMutation,
      advanceMutation,
      resetMutation,
      leaveMutation,
      timeoutMutation,
    },
    isPending: {
      isJoining: joinMutation.isPending,
      isActing: actMutation.isPending,
      isAdvancing: advanceMutation.isPending,
      isResetting: resetMutation.isPending,
      isLeaving: leaveMutation.isPending,
      isTimingOut: timeoutMutation.isPending,
    },
    showError,
  } as const;
}
