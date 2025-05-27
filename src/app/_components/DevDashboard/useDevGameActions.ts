import { useRouter } from "next/navigation";
import { createClient } from "~/supabase/client";
import { api } from "~/trpc/react";

const client = createClient();

const useDevGameActions = () => {
	const utils = api.useUtils();
	const loginMutation = api.admin.loginAsUser.useMutation();
	const advanceGameMutation = api.admin.advanceGame.useMutation({
		onSuccess: async () => {
			await utils.player.getAllGames.invalidate();
		},
	});
	const router = useRouter();

	async function loginAsUser(email: string, redirectTo?: string) {
		await loginMutation.mutateAsync(
			{ email },
			{
				async onSuccess(data) {
					await client.auth.setSession({
						access_token: data.access_token,
						refresh_token: data.refresh_token,
					});
					if (redirectTo || window.location.pathname === "/login")
						router.push(redirectTo ?? "/");

					router.refresh();
				},
			},
		);
	}

	return {
		loginAsUser,
		loading: loginMutation.isPending,
		advanceGame: advanceGameMutation.mutate,
		advanceGameLoading: advanceGameMutation.isPending,
	};
};

export default useDevGameActions;
