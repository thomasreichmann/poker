import { createServerClient } from "@supabase/ssr";

import { logger } from "@/logger/index";

type RealtimeTransport = "rest" | "sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_TOKEN;

export async function broadcastViaRest(
  topic: string,
  event: string,
  payload: unknown
): Promise<void> {
  console.log("test");
  logger.info("test");
  logger.warn("test");
  logger.error("test");
  logger.debug("test");
  if (!supabaseUrl || !serviceRoleKey) {
    logger.error(
      { error: "Supabase URL or service role key is not set" },
      "realtime.broadcastViaRest.misconfigured"
    );
    return;
  }

  logger.debug({ topic, event, payload }, "realtime.broadcastViaRest.debug");
  const endpoint = `${supabaseUrl.replace(
    /\/$/,
    ""
  )}/realtime/v1/api/broadcast`;
  const body = JSON.stringify({
    messages: [
      {
        topic,
        event,
        payload,
      },
    ],
  });

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body,
  }).catch((error) => {
    logger.error(
      { error: error.message },
      "realtime.broadcastViaRest.fetchError"
    );
  });
}

export async function broadcastViaSdk(
  topic: string,
  event: string,
  payload: unknown
): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) return;
  // Minimal server client purely for sending broadcast via HTTP (no cookies required)
  const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      get() {
        return undefined;
      },
      set() {},
      remove() {},
    },
  });
  const channel = supabase.channel(topic, { config: { private: true } });
  await channel
    .send({ type: "broadcast", event, payload })
    .catch(() => {})
    .finally(() => {
      try {
        void supabase.removeChannel(channel);
      } catch {}
    });
}

export async function broadcast(
  topic: string,
  event: string,
  payload: unknown
): Promise<void> {
  const transport =
    (process.env.REALTIME_TRANSPORT as RealtimeTransport) || "rest";
  if (transport === "sdk") {
    await broadcastViaSdk(topic, event, payload);
  } else {
    await broadcastViaRest(topic, event, payload);
  }
}
