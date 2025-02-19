"use client";

import Button from "@mui/material/Button";
import { type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "~/supabase/client";
import { api } from "~/trpc/react";

const client = createClient();

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as Record<string, any>).supabase = client;
}

function UserActions({ user }: { user: User }) {
	const router = useRouter();

	const loginAsUser = api.admin.loginAsUser.useMutation({
		async onSuccess(data) {
			await client.auth.setSession({
				access_token: data.access_token,
				refresh_token: data.refresh_token,
			});

			router.push("/");
			router.refresh();
		},
	});

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				await loginAsUser.mutateAsync({ email: user.email! });
			}}
		>
			<Button variant="outlined" loading={loginAsUser.isPending} type="submit">
				Login as user
			</Button>
		</form>
	);
}

export default UserActions;
