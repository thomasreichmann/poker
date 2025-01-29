"use client";

import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "~/supabase/client";

const supabase = createClient();

function SignOutButtonComponent() {
	const [loading, setLoading] = useState(false);

	const router = useRouter();

	async function signOut() {
		setLoading(true);
		await supabase.auth.signOut();
		router.refresh();
		setLoading(false);
	}

	return (
		<Button onClick={signOut} loading={loading}>
			Logout
		</Button>
	);
}

export default SignOutButtonComponent;
