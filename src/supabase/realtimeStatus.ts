import { useSyncExternalStore } from "react";

export type RealtimeConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export type RealtimeChannelState =
  | "closed"
  | "errored"
  | "joined"
  | "joining"
  | "leaving";

export type RealtimeChannelInfo = {
  topic: string;
  state: RealtimeChannelState;
};

export type BroadcastCounters = {
  INSERT: number;
  UPDATE: number;
  DELETE: number;
  OTHER: number;
};

export type LifecycleEvent = {
  id: number;
  at: number;
  time: string; // preformatted local time for rendering
  topic: string;
  status: string; // raw status like SUBSCRIBED/CLOSED/CHANNEL_ERROR/TIMED_OUT or state updates
};

export type LastBroadcast = {
  at: number;
  event: string;
  table: string;
} | null;

export type RealtimeStatusState = {
  channels: RealtimeChannelInfo[];
  connectionStatus: RealtimeConnectionStatus;
  counters: BroadcastCounters;
  lastBroadcast: LastBroadcast;
  lastError: string | null;
  lifecycle: LifecycleEvent[]; // newest first, capped
};

let MAX_LIFECYCLE = 50;

function deriveConnectionStatus(
  channels: RealtimeChannelInfo[],
  lastError: string | null
): RealtimeConnectionStatus {
  if (lastError) return "error";
  if (!channels.length) return "disconnected";
  if (channels.some((c) => c.state === "errored")) return "error";
  if (channels.some((c) => c.state === "joined")) return "connected";
  if (channels.some((c) => c.state === "joining" || c.state === "leaving"))
    return "connecting";
  return "disconnected";
}

class RealtimeStatusStore {
  private state: RealtimeStatusState = {
    channels: [],
    connectionStatus: "disconnected",
    counters: { INSERT: 0, UPDATE: 0, DELETE: 0, OTHER: 0 },
    lastBroadcast: null,
    lastError: null,
    lifecycle: [],
  };
  private nextLifecycleId = 1;

  private listeners: Set<() => void> = new Set();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private setState(next: Partial<RealtimeStatusState>) {
    // produce a new top-level object to ensure useSyncExternalStore detects change
    this.state = { ...this.state, ...next };
    this.emit();
  }

  private upsertChannelImmutable(
    channels: RealtimeChannelInfo[],
    topic: string,
    state: RealtimeChannelState
  ): RealtimeChannelInfo[] {
    const idx = channels.findIndex((c) => c.topic === topic);
    if (idx >= 0) {
      const copy = channels.slice();
      copy[idx] = { topic, state };
      return copy;
    }
    return [...channels, { topic, state }];
  }

  recordLifecycle(topic: string, status: string) {
    const at = Date.now();
    const evt: LifecycleEvent = {
      id: this.nextLifecycleId++,
      at,
      time: new Date(at).toLocaleTimeString(),
      topic,
      status,
    };
    const last = this.state.lifecycle[0];
    if (last && last.topic === topic && last.status === status) {
      // drop duplicate consecutive status for the same topic
      return;
    }
    const nextLifecycle = [evt, ...this.state.lifecycle].slice(
      0,
      MAX_LIFECYCLE
    );
    // Heuristically map some statuses to channel state
    const mapped: Record<string, RealtimeChannelState | undefined> = {
      SUBSCRIBED: "joined",
      CLOSED: "closed",
      CHANNEL_ERROR: "errored",
      TIMED_OUT: "errored",
      JOINING: "joining",
      LEAVING: "leaving",
    };
    const state = mapped[status] ?? undefined;
    const nextChannels = state
      ? this.upsertChannelImmutable(this.state.channels, topic, state)
      : this.state.channels;
    const nextConnection = deriveConnectionStatus(
      nextChannels,
      this.state.lastError
    );
    this.setState({
      lifecycle: nextLifecycle,
      channels: nextChannels,
      connectionStatus: nextConnection,
    });
  }

  setChannelState(topic: string, state: RealtimeChannelState) {
    // recordLifecycle will upsert channel and update status
    this.recordLifecycle(topic, String(state));
  }

  recordBroadcast(event: string, table: string) {
    const at = Date.now();
    const key = (event?.toUpperCase?.() as keyof BroadcastCounters) ?? "OTHER";
    const counters = { ...this.state.counters };
    if (key === "INSERT" || key === "UPDATE" || key === "DELETE") {
      counters[key] = counters[key] + 1;
    } else {
      counters.OTHER = counters.OTHER + 1;
    }
    this.setState({ counters, lastBroadcast: { at, event, table } });
  }

  recordError(message: string) {
    const nextConnection = deriveConnectionStatus(this.state.channels, message);
    this.setState({ lastError: message, connectionStatus: nextConnection });
    this.recordLifecycle("-", `error:${message}`);
  }

  clearLifecycle() {
    this.setState({ lifecycle: [] });
  }

  reset() {
    this.state = {
      channels: [],
      connectionStatus: "disconnected",
      counters: { INSERT: 0, UPDATE: 0, DELETE: 0, OTHER: 0 },
      lastBroadcast: null,
      lastError: null,
      lifecycle: [],
    };
    this.emit();
  }

  setLifecycleLimit(limit: number) {
    MAX_LIFECYCLE = Math.max(10, Math.min(1000, Math.floor(limit)));
  }
}

export const realtimeStatusStore = new RealtimeStatusStore();

export function useRealtimeStatus(): RealtimeStatusState {
  return useSyncExternalStore(
    realtimeStatusStore.subscribe,
    realtimeStatusStore.getSnapshot,
    realtimeStatusStore.getSnapshot
  );
}
