import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  computeBackupDelayMs,
  computeNonActorSlotDelayMs,
} from "./useTurnManagement";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useTurnManagement helpers", () => {
  test("computeBackupDelayMs returns null if no deadline", () => {
    expect(computeBackupDelayMs(null)).toBeNull();
    expect(computeBackupDelayMs(undefined)).toBeNull();
  });

  test("computeBackupDelayMs provides small grace when deadline has passed", () => {
    const past = Date.now() - 5000;
    expect(computeBackupDelayMs(past)).toBeGreaterThanOrEqual(150);
  });

  test("computeBackupDelayMs computes small grace after future deadline", () => {
    const now = Date.now();
    const future = now + 2000; // 2s in future
    const delay = computeBackupDelayMs(future);
    // should be close to future-now + 1.25s, but at least >= 1s
    expect(delay).toBeGreaterThanOrEqual(1000);
  });

  test("computeNonActorSlotDelayMs increases exponentially by seat distance with jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // no jitter
    const seats = 6;
    const nextSeat = 3; // current actor seat
    const myNear = 4; // distance 1 -> baseSlot
    const myFar = 6; // distance 3 -> baseSlot * 4
    const near = computeNonActorSlotDelayMs(seats, nextSeat, myNear);
    const far = computeNonActorSlotDelayMs(seats, nextSeat, myFar);
    expect(far).toBeGreaterThan(near);
  });

  test("computeNonActorSlotDelayMs applies jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // near max jitter
    const seats = 9;
    const nextSeat = 1;
    const mySeat = 2; // distance 1
    const val = computeNonActorSlotDelayMs(seats, nextSeat, mySeat);
    expect(val).toBeGreaterThanOrEqual(120); // base
  });
});
