import { Suspense } from "react";
import { api, HydrateClient } from "~/trpc/server";
import { PublicTablesComponent } from "./PublicTables";

export default async function PublicTables() {
	void api.player.getAllGames.prefetch();

	return (
		<HydrateClient>
			<Suspense fallback={<p>Loading...</p>}>
				<PublicTablesComponent />
			</Suspense>
		</HydrateClient>
	);
}
