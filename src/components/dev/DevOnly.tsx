"use client";

import { useDevAccess } from "@/hooks/useDevAccess";
import React from "react";

type DevOnlyProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** If true, returns null while loading to prevent flicker (default true) */
  hideWhileLoading?: boolean;
};

export function DevOnly({
  children,
  fallback = null,
  hideWhileLoading = true,
}: DevOnlyProps) {
  const { hasDevAccess, isLoading } = useDevAccess();

  if (isLoading && hideWhileLoading) return null;
  if (!hasDevAccess) return <>{fallback}</>;
  return <>{children}</>;
}
