"use client";

import Button from "@mui/material/Button";
import { type User } from "@supabase/supabase-js";
import { useState } from "react";
import { api } from "~/trpc/react";

function UserActions({ user }: { user: User }) {
	const [loading, setLoading] = useState(false);

	const loginAsUser = api.admin.getMagicLink.useMutation();
	console.log("mounted");

	return (
		<form onSubmit>
			<Button variant="outlined" loading={loading} type="submit">
				Login as user
			</Button>
		</form>
	);
}

export default UserActions;
