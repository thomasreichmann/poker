import { pgEnum } from "drizzle-orm/pg-core";
import { z } from "zod";

export const ActionType = pgEnum("action_type", [
	"bet",
	"check",
	"call",
	"raise",
	"fold",
	"timeout",
]);

export const ActionTypeSchema = z.enum(ActionType.enumValues);
