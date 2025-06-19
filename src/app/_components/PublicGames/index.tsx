import { api, HydrateClient } from "~/trpc/server";
import { PublicGamesWithRealtime } from "./PublicGamesWithRealtime";

export default async function PublicGames() {
	await api.player.getAllGames.prefetch();

	return (
		<div className="flex flex-col gap-4">
			<HydrateClient>
				<PublicGamesWithRealtime />
			</HydrateClient>
		</div>
	);
}
