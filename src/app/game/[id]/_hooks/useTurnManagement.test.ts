import { describe, expect, test } from "vitest";
import { computeBackupDelayMs } from "./useTurnManagement";

describe("useTurnManagement helpers", () => {
  test("computeBackupDelayMs returns null if no deadline", () => {
    expect(computeBackupDelayMs(null)).toBeNull();
    expect(computeBackupDelayMs(undefined)).toBeNull();
  });

  test("computeBackupDelayMs provides >= 1s delay when deadline has passed", () => {
    const past = Date.now() - 5000;
    expect(computeBackupDelayMs(past)).toBeGreaterThanOrEqual(1000);
  });

  test("computeBackupDelayMs computes small grace after future deadline", () => {
    const now = Date.now();
    const future = now + 2000; // 2s in future
    const delay = computeBackupDelayMs(future);
    // should be close to future-now + 1.25s, but at least >= 1s
    expect(delay).toBeGreaterThanOrEqual(1000);
  });
});
