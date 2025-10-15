import type { SupabaseClient } from "@supabase/supabase-js";
import { channelRegistry } from "./channelRegistry";

export type SubscribeStatus =
  | "SUBSCRIBED"
  | "CLOSED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT";

type OnStatus = (s: SubscribeStatus) => void;
type OnBroadcast = (payload: unknown) => void;

function asClientLike(client: SupabaseClient) {
  return {
    removeChannel: (ch: unknown) => client.removeChannel(ch as never),
  };
}

export function acquireTopicChannel(
  client: SupabaseClient,
  topic: string,
  onStatus: OnStatus,
  onBroadcast: OnBroadcast
): () => Promise<unknown> | unknown {
  const createChannel = () =>
    client
      .channel(topic, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, onBroadcast)
      .on("broadcast", { event: "UPDATE" }, onBroadcast)
      .on("broadcast", { event: "DELETE" }, onBroadcast)
      .subscribe((status) => onStatus(status as SubscribeStatus));

  channelRegistry.acquire(topic, createChannel);
  return () => channelRegistry.release(asClientLike(client), topic);
}
