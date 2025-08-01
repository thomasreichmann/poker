import { z } from "zod";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";

export const authRouter = createTRPCRouter({
  // Get current user profile
  getProfile: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      firstName: ctx.user.user_metadata?.firstName,
      lastName: ctx.user.user_metadata?.lastName,
      phone: ctx.user.user_metadata?.phone,
    };
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.updateUser({
        data: input,
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    }),

  // Check if user is authenticated (public endpoint)
  isAuthenticated: baseProcedure.query(({ ctx }) => {
    return {
      isAuthenticated: !!ctx.user,
      user: ctx.user
        ? {
            id: ctx.user.id,
            email: ctx.user.email,
          }
        : null,
    };
  }),
});
