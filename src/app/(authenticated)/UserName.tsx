"use client";

import { useEffect, useState } from "react";
import { createClient } from "~/supabase/client";

const client = createClient();

export default function UserName() {
	const [userName, setUserName] = useState<string | null>(null);

	useEffect(() => {
		void (async () => {
			const {
				data: { user },
			} = await client.auth.getUser();
			setUserName(user?.email ?? null);
		})();
	}, []);

	return <>{userName}</>;
}
