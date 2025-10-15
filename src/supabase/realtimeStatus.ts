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

  private upsertChannel(topic: string, state: RealtimeChannelState) {
    const existingIndex = this.state.channels.findIndex(
      (c) => c.topic === topic
    );
    if (existingIndex >= 0) {
      this.state.channels[existingIndex] = { topic, state };
    } else {
      this.state.channels = [...this.state.channels, { topic, state }];
    }
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
    this.state.lifecycle = [evt, ...this.state.lifecycle].slice(
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
    if (state) this.upsertChannel(topic, state);
    this.state.connectionStatus = deriveConnectionStatus(
      this.state.channels,
      this.state.lastError
    );
    this.emit();
  }

  setChannelState(topic: string, state: RealtimeChannelState) {
    // recordLifecycle will upsert channel and update status
    this.recordLifecycle(topic, String(state));
  }

  recordBroadcast(event: string, table: string) {
    const at = Date.now();
    const key = (event?.toUpperCase?.() as keyof BroadcastCounters) ?? "OTHER";
    if (key === "INSERT" || key === "UPDATE" || key === "DELETE") {
      this.state.counters = {
        ...this.state.counters,
        [key]: this.state.counters[key] + 1,
      };
    } else {
      this.state.counters = {
        ...this.state.counters,
        OTHER: this.state.counters.OTHER + 1,
      };
    }
    this.state.lastBroadcast = { at, event, table };
    this.emit();
  }

  recordError(message: string) {
    this.state.lastError = message;
    this.state.connectionStatus = deriveConnectionStatus(
      this.state.channels,
      this.state.lastError
    );
    this.recordLifecycle("-", `error:${message}`);
    this.emit();
  }

  clearLifecycle() {
    this.state.lifecycle = [];
    this.emit();
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
