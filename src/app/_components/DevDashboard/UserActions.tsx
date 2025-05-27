"use client";

import Button from "@mui/material/Button";
import { type User } from "@supabase/supabase-js";
import { createClient } from "~/supabase/client";
import useDevGameActions from "./useDevGameActions";

const client = createClient();

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as Record<string, any>).supabase = client;
}

function UserActions({ user }: { user: User }) {
	const { loginAsUser } = useDevGameActions();

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				await loginAsUser(user.email!);
			}}
		>
			<Button variant="outlined" type="submit">
				Login as user
			</Button>
		</form>
	);
}

export default UserActions;
