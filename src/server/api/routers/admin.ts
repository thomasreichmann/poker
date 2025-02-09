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
