import { describe, expect, test, vi } from "vitest";
import { ensureLiveTransportAction, isMockTransport } from "./guards";

describe("transport guards", () => {
  test("isMockTransport identifies mock kind", () => {
    expect(isMockTransport("mock")).toBe(true);
    expect(isMockTransport("supabase")).toBe(false);
    expect(isMockTransport(undefined)).toBe(false);
  });

  test("ensureLiveTransportAction blocks and notifies for mock mode", () => {
    const notify = vi.fn();
    const allowed = ensureLiveTransportAction({ isMock: true, notify });
    expect(allowed).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test("ensureLiveTransportAction allows live transports", () => {
    const notify = vi.fn();
    const allowed = ensureLiveTransportAction({ isMock: false, notify });
    expect(allowed).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });
});
