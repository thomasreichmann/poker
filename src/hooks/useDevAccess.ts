"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to check if current user has development access
 * This performs a server-side permission check
 */
export function useDevAccess() {
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.dev.checkAccess.queryOptions()
  );

  return {
    hasDevAccess: data?.hasAccess ?? false,
    userRole: data?.role ?? null,
    isLoading,
    error,
    // Helper for conditional rendering
    canShowDevFeatures: data?.hasAccess ?? false,
  };
}

