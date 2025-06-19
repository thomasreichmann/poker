import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { advanceGameState, resetGame } from "~/lib/poker/engine";
import { type AuthenticatedTRPCContext, createTRPCRouter, devProcedure } from "~/server/api/trpc";
import { games } from "~/server/db/schema/games";
import { players } from "~/server/db/schema/players";
import { createServiceClient } from "~/supabase/server";

const supabase = createServiceClient();

export const adminRouter = createTRPCRouter({
	users: devProcedure.query(async () => {
		const { data, error } = await supabase.auth.admin.listUsers();

		if (error) {
			throw new Error("Failed to fetch users", { cause: error });
		}

		return data.users;
	}),
	loginAsUser: devProcedure
		.input(
			z.object({
				email: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			let email: string = input.email;

			// If input doesn't contain '@', assume it's a userId or playerId
			if (!email.includes("@")) {
				// First try to fetch user by ID
				const { data: userData, error: userError } =
					await supabase.auth.admin.getUserById(email);

				if (userError || !userData.user) {
					// If user not found, try to fetch player and get associated user
					const [player] = await ctx.db
						.select()
						.from(players)
						.where(eq(players.id, email));

					if (!player) {
						throw new Error("No user or player found with the given ID");
					}

					const { data: playerUserData, error: playerUserError } =
						await supabase.auth.admin.getUserById(player.userId);

					if (playerUserError || !playerUserData.user) {
						throw new Error("Failed to fetch user associated with player", {
							cause: playerUserError,
						});
					}

					const playerUserEmail = playerUserData.user.email;

					if (!playerUserEmail) {
						throw new Error("User associated with player has no email address");
					}

					email = playerUserEmail;
				} else {
					const userEmail = userData.user.email;

					if (!userEmail) {
						throw new Error("User has no email address");
					}

					email = userEmail;
				}
			}

			const { data, error } = await supabase.auth.admin.generateLink({
				email,
				type: "magiclink",
			});

			if (error) {
				throw new Error("Failed to generate link", { cause: error });
			}

			const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
				token_hash: data.properties.hashed_token,
				type: "email",
			});

			if (sessionError || !sessionData.session) {
				throw new Error("Failed to verify link", { cause: sessionError });
			}

			return sessionData.session;
		}),
	getMagicLink: devProcedure
		.input(
			z.object({
				id: z.string(),
				email: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			console.log(input);
			const { data, error } = await supabase.auth.admin.generateLink({
				email: input.email,
				type: "magiclink",
			});

			if (error) {
				throw new Error("Failed to generate link", { cause: error });
			}

			return data.properties.action_link;
		}),
	resetGame: devProcedure
		.input(
			z.object({
				gameId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const [game] = await ctx.db.select().from(games).where(eq(games.id, input.gameId));
			if (!game) {
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Game not found" });
			}

			await resetGame(ctx as AuthenticatedTRPCContext, input.gameId);
		}),
	advanceGame: devProcedure
		.input(
			z.object({
				gameId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const [game] = await ctx.db.select().from(games).where(eq(games.id, input.gameId));

			if (!game) {
				throw new Error("Game not found");
			}

			await advanceGameState(ctx as AuthenticatedTRPCContext, game);
		}),
});
