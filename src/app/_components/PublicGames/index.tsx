import { api, HydrateClient } from "~/trpc/server";
import { PublicGamesComponent } from "./PublicGames";

export default async function PublicGames() {
	await api.player.getAllGames.prefetch();

	return (
		<div className="flex flex-col gap-4">
			<HydrateClient>
				<PublicGamesComponent />
			</HydrateClient>
		</div>
	);
}
