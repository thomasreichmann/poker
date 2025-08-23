export function isAnimationsEnabled(): boolean {
  const envFlag = process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS;
  if (envFlag != null) {
    return envFlag === "1" || envFlag?.toLowerCase() === "true";
  }
  // Default: enable in non-production for dev/staging, disabled in prod unless explicitly enabled
  return process.env.NODE_ENV !== "production";
}