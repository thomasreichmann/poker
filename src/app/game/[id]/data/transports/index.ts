import type { GameDataTransport, GameDataTransportKind } from "../types";
import { MockTransport } from "./mock";
import { SupabaseTransport } from "./supabase";

export function createTransport(kind: GameDataTransportKind): GameDataTransport {
  switch (kind) {
    case "mock":
      return new MockTransport();
    case "supabase":
    default:
      return new SupabaseTransport();
  }
}
