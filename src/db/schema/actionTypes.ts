import { pgEnum } from "drizzle-orm/pg-core";
import { z } from "zod";

export const PgEnumAction = pgEnum("action_type", [
  "bet",
  "check",
  "call",
  "raise",
  "fold",
  "timeout",
]);

export const ZodActionSchema = z.enum(PgEnumAction.enumValues);
export type PokerAction = z.infer<typeof ZodActionSchema>;

// Add actor source enum to annotate whether an action was made by a human or a bot
export const PgEnumActorSource = pgEnum("actor_source", ["human", "bot"]);
