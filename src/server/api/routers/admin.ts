import { z } from "zod";
import { createTRPCRouter, devProcedure } from "~/server/api/trpc";
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
		.mutation(async ({ input }) => {
			const { data, error } = await supabase.auth.admin.generateLink({
				email: input.email,
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
});
