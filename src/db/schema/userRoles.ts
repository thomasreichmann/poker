import { users } from "@/db/schema/users";
import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

export const PgEnumUserRole = pgEnum("user_role", ["user", "admin", "dev"]);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }), // References auth.users.id
  role: PgEnumUserRole("role").default("user").notNull(), // user, admin, dev
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
