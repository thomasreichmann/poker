import { db } from "@/db";
import { games } from "@/db/schema/games";
import { requireDevAccess } from "@/lib/permissions";
import { startManager } from "@/lib/simulator/registry";
import type { SimulatorConfig } from "@/lib/simulator/types";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, devOnlyProcedure } from "../init";

const SimulatorConfigInput = z.custom<SimulatorConfig>();

export const simulatorRouter = createTRPCRouter({
  enable: devOnlyProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        config: SimulatorConfigInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireDevAccess(ctx.user.id);

      const config: SimulatorConfig = {
        ...(input.config as object),
        enabled: true,
      } as SimulatorConfig;
      await db
        .update(games)
        .set({ simulatorConfig: config as unknown as object })
        .where(eq(games.id, input.tableId));

      startManager(input.tableId);
      return { success: true };
    }),

  updateConfig: devOnlyProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        config: z.custom<Partial<SimulatorConfig>>(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireDevAccess(ctx.user.id);

      const [row] = await db
        .select()
        .from(games)
        .where(eq(games.id, input.tableId))
        .limit(1);
      if (!row) throw new Error("Game not found");
      const prev =
        (row.simulatorConfig as unknown as SimulatorConfig) ||
        ({} as SimulatorConfig);
      const next = { ...prev, ...(input.config as object) } as SimulatorConfig;
      await db
        .update(games)
        .set({ simulatorConfig: next as unknown as object })
        .where(eq(games.id, input.tableId));
      startManager(input.tableId);
      return { success: true };
    }),

  pause: devOnlyProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireDevAccess(ctx.user.id);
      const next: SimulatorConfig = {
        paused: true,
        enabled: true,
      } as SimulatorConfig;
      await db
        .update(games)
        .set({ simulatorConfig: next as unknown as object })
        .where(eq(games.id, input.tableId));
      return { success: true };
    }),

  resume: devOnlyProcedure
    .input(z.object({ tableId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireDevAccess(ctx.user.id);
      const next: SimulatorConfig = {
        paused: false,
        enabled: true,
      } as SimulatorConfig;
      await db
        .update(games)
        .set({ simulatorConfig: next as unknown as object })
        .where(eq(games.id, input.tableId));
      startManager(input.tableId);
      return { success: true };
    }),

  exportHandHistory: devOnlyProcedure
    .input(z.object({ tableId: z.string().uuid(), handId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await requireDevAccess(ctx.user.id);
      const { actions } = await import("@/db/schema/actions");
      const list = await db
        .select()
        .from(actions)
        .where(
          and(
            eq(actions.gameId, input.tableId),
            eq(actions.handId, input.handId)
          )
        )
        .orderBy(actions.createdAt);
      return {
        tableId: input.tableId,
        handId: input.handId,
        actions: list,
      };
    }),
});
