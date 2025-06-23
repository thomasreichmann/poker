import { type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { type Game } from "~/server/db/schema/games";
import { createClient } from "~/supabase/client";

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, string>>;

const supabase = createClient();

const useRealtime = (gameId: string) => {
	const [game, setGame] = useState<Game>();

	useEffect(() => {
		const channel = supabase
			.channel("schema-db-changes")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "poker_games",
				},
				(payload: RealtimePayload) => {
					// TODO: fix this, this attempt doesnt work, find out how to convert the snake case we get from realtime in to actual objects with the expected names.
					// setGame(JSON.parse(toCamelCase(JSON.stringify(payload.new))) as Game);
				},
			)
			.subscribe();

		return () => {
			void channel.unsubscribe();
		};
	}, []);

	return { game };
};

export default useRealtime;
