import type { SupabaseClient } from "@supabase/supabase-js";
import { channelRegistry } from "./channelRegistry";

export type SubscribeStatus =
  | "SUBSCRIBED"
  | "CLOSED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT";

export function acquireTopicChannel(
  client: SupabaseClient,
  topic: string,
  onStatus: (s: SubscribeStatus) => void,
  onBroadcast: (payload: unknown) => void
) {
  channelRegistry.acquire(topic, () =>
    client
      .channel(topic, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, onBroadcast)
      .on("broadcast", { event: "UPDATE" }, onBroadcast)
      .on("broadcast", { event: "DELETE" }, onBroadcast)
      .subscribe((status) => onStatus(status as SubscribeStatus))
  );
  return () => channelRegistry.release(client, topic);
}
