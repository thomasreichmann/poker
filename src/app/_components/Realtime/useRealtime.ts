import { type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { type PublicGame } from "~/server/api/routers/player/player";
import { type Game } from "~/server/db/schema/games";
import { createClient } from "~/supabase/client";
import { api } from "~/trpc/react";

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, string>>;

const supabase = createClient();

// Utility function to convert snake_case to camelCase
function snakeToCamelCase(str: string): string {
	return str.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

// Utility function to convert object keys from snake_case to camelCase
function convertSnakeToCamelCase<T extends Record<string, unknown>>(
	obj: T,
): Record<string, unknown> | unknown[] {
	if (obj === null || typeof obj !== "object") {
		return obj as Record<string, unknown>;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => convertSnakeToCamelCase(item as Record<string, unknown>));
	}

	const converted: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		const camelKey = snakeToCamelCase(key);
		converted[camelKey] = convertSnakeToCamelCase(value as Record<string, unknown>);
	}
	return converted;
}

const useRealtimeGame = (initialGame: PublicGame) => {
	const [game, setGame] = useState<PublicGame>(initialGame);

	// Query to get community cards
	const getCommunityCardsQuery = api.player.cards.getCommunityCards.useQuery(
		{ gameId: game.id },
		{
			enabled: false, // Only fetch when needed
		},
	);

	// Update community cards when query data changes
	useEffect(() => {
		if (getCommunityCardsQuery.data) {
			setGame((prevGame) => ({
				...prevGame,
				communityCards: getCommunityCardsQuery.data,
			}));
		}
	}, [getCommunityCardsQuery.data]);

	const handleRealtimeUpdate = async (payload: RealtimePayload) => {
		if (payload.new) {
			const convertedGame = convertSnakeToCamelCase(payload.new) as Game;
			// Along side the game, we also need to update last player to act's state using the lastAction and lastBetAmount fields.
			const lastPlayerToAct = game.players?.find(
				(player) => player.id === game.currentPlayerTurn,
			);
			if (lastPlayerToAct) {
				lastPlayerToAct.hasFolded = convertedGame.lastAction === "fold";
				lastPlayerToAct.currentBet = convertedGame.lastBetAmount ?? 1111;
				lastPlayerToAct.stack = lastPlayerToAct.stack - (convertedGame.lastBetAmount ?? 0);
			}

			// If the round progresses, we need to fetch the new cards.
			if (convertedGame.currentRound !== game.currentRound) {
				// Fetch updated community cards
				void getCommunityCardsQuery.refetch();
			}

			setGame((prevGame) => ({
				...prevGame,
				...convertedGame,
				players: prevGame.players?.map((p) =>
					p.id === lastPlayerToAct?.id ? lastPlayerToAct : p,
				),
			}));
		}
	};

	// The game coming from the realtime channel doesn't have any relational data, so we need to update the game state with the new data.
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
				(payload) => {
					void handleRealtimeUpdate(payload);
				},
			)
			.subscribe();

		return () => {
			void channel.unsubscribe();
		};
	}, []);

	return { game };
};

export default useRealtimeGame;
