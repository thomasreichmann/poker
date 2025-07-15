import { useEffect, useState } from "react";
import { type PublicGame } from "~/server/api/routers/player/player";
import { createClient } from "~/supabase/client";
import { api } from "~/trpc/react";

type BroadcastPayload = {
	event: "UPDATE";
	payload: {
		id: string;
		old_record: Record<string, unknown>;
		operation: "UPDATE";
		record: Record<string, unknown>;
		schema: string;
		table: string;
	};
	type: "broadcast";
};

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
	const [game, setGame] = useState<PublicGame & { newGame?: boolean }>(initialGame);

	// Query to get player's cards - only used when new game starts
	const getPlayerCardsQuery = api.player.cards.getPlayerCards.useQuery(
		{ gameId: game.id },
		{
			enabled: false, // Only fetch when needed
		},
	);

	const handleRealtimeUpdate = async (update: BroadcastPayload) => {
		console.log(update);
		if (update.payload.record) {
			const convertedGame = convertSnakeToCamelCase(update.payload.record) as PublicGame;

			const isNewGameStarting =
				game.newGame === undefined &&
				game.status !== "waiting" &&
				convertedGame.status === "waiting";

			// Now the broadcast includes complete game state with all relations
			// We need to reconstruct the PublicGame format that matches the getAllGames query
			const updatedGame: PublicGame & { newGame?: boolean } = {
				...convertedGame,
				hasJoined: !!convertedGame.players?.find(
					(player: { userId: string }) => player.userId === game.callerPlayer?.userId,
				),
				communityCards: convertedGame.cards,
				callerPlayer:
					convertedGame.players?.find(
						(player: { userId: string }) => player.userId === game.callerPlayer?.userId,
					) ?? game.callerPlayer,
				newGame: isNewGameStarting,
			};

			if (isNewGameStarting) {
				// Fetch player's cards since they won't be in the broadcast for security
				console.log("New game starting, fetching player cards...");
				void getPlayerCardsQuery.refetch();
			}

			setGame(updatedGame);
		}
	};

	// Update game state when player cards are fetched
	useEffect(() => {
		if (getPlayerCardsQuery.data && game.callerPlayer) {
			setGame((prevGame) => ({
				...prevGame,
				callerPlayer: {
					...prevGame.callerPlayer!,
					cards: getPlayerCardsQuery.data,
				},
				players: prevGame.players.map((player) =>
					player.id === prevGame.callerPlayer?.id
						? { ...player, cards: getPlayerCardsQuery.data }
						: player,
				),
			}));
		}
	}, [getPlayerCardsQuery.data]);

	// The game coming from the realtime channel now includes complete relational data
	useEffect(() => {
		const channel = supabase
			.channel(`topic:${game.id}`, {
				config: {
					private: true,
				},
			})
			.on("broadcast", { event: "UPDATE" }, (payload) => {
				void handleRealtimeUpdate(payload as BroadcastPayload);
			})
			.subscribe();

		return () => {
			void channel.unsubscribe();
		};
	}, []);

	return { game };
};

export default useRealtimeGame;
