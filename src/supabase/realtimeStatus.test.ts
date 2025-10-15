import { describe, expect, test } from "vitest";
import { realtimeStatusStore } from "./realtimeStatus";

describe("realtimeStatus store", () => {
  test("lifecycle records update channels and derive connection", () => {
    realtimeStatusStore.reset();
    realtimeStatusStore.recordLifecycle("topic:1", "SUBSCRIBED");
    const snap = (
      realtimeStatusStore as unknown as {
        getSnapshot: () => ReturnType<
          (typeof realtimeStatusStore)["getSnapshot"]
        >;
      }
    ).getSnapshot();
    expect(snap.channels[0].state).toBe("joined");
    expect(["connected", "connecting"]).toContain(snap.connectionStatus);
  });
});
