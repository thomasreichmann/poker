import { redirect } from "next/navigation";

import { createClient } from "~/supabase/server";
import PokerProbability from "./pokerProbability";

export default async function PrivatePage() {
	const supabase = createClient();

	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) {
		redirect("/login");
	}

	return (
		<main className="container mx-auto p-6">
			<PokerProbability />
		</main>
	);
}
