import { useRouter } from "next/navigation";
import { createClient } from "~/supabase/client";
import { api } from "~/trpc/react";

const client = createClient();

const useDevGameActions = () => {
	const loginMutation = api.admin.loginAsUser.useMutation();
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

	return { loginAsUser };
};

export default useDevGameActions;
