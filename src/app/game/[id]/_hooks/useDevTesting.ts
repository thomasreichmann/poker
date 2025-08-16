"use client";

import { useToast } from "@/components/ui/toast";
import { useEffect, useState } from "react";

/**
 * Hook for development testing features including player impersonation
 */
export function useDevTesting() {
  const [currentImpersonatedUserId, setCurrentImpersonatedUserId] = useState<
    string | null
  >(null);
  const { toast } = useToast();

  // Track current impersonation from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkImpersonation = () => {
      const userId = window.sessionStorage.getItem("dev_impersonate_user_id");
      setCurrentImpersonatedUserId(userId);
    };

    // Check initially
    checkImpersonation();

    // Listen for storage changes (when other tabs change impersonation)
    window.addEventListener("storage", checkImpersonation);

    // Check periodically for same-tab changes
    const interval = setInterval(checkImpersonation, 1000);

    return () => {
      window.removeEventListener("storage", checkImpersonation);
      clearInterval(interval);
    };
  }, []);

  const impersonateUser = async (userId: string) => {
    if (typeof window === "undefined") return;

    try {
      // Store in sessionStorage for immediate effect
      window.sessionStorage.setItem("dev_impersonate_user_id", userId);
      setCurrentImpersonatedUserId(userId);

      // Also set cookie for cross-tab persistence
      await fetch("/api/dev/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      // Force a page refresh to pick up the new user context
      window.location.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Impersonation failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const clearImpersonation = async () => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.removeItem("dev_impersonate_user_id");
      setCurrentImpersonatedUserId(null);

      await fetch("/api/dev/impersonate", { method: "DELETE" });

      // Force a page refresh to clear the user context
      window.location.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Clear impersonation failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const switchToPlayerUser = async (playerUserId: string) => {
    if (currentImpersonatedUserId === playerUserId) {
      return; // Already impersonating this user
    }

    await impersonateUser(playerUserId);
  };

  return {
    currentImpersonatedUserId,
    isImpersonating: !!currentImpersonatedUserId,
    impersonateUser,
    clearImpersonation,
    switchToPlayerUser,
  };
}
