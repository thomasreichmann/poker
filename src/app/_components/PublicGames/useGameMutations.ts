import { api } from "~/trpc/react";

export function useGameMutations() {
	const utils = api.useUtils();

	const invalidateGames = async () => {
		await utils.game.getAll.invalidate();
		await utils.player.getAllGames.invalidate();
	};

	const createGame = api.game.create.useMutation({
		onSuccess: invalidateGames,
	});

	const deleteGame = api.game.delete.useMutation({
		onSuccess: invalidateGames,
	});

	const joinGame = api.game.join.useMutation({
		onSuccess: invalidateGames,
	});

	const leaveGame = api.game.leave.useMutation({
		onSuccess: invalidateGames,
	});

	const handleJoinGame = async (gameId: string) => {
		await joinGame.mutateAsync({ gameId });
	};

	const handleLeaveGame = async (gameId: string) => {
		await leaveGame.mutateAsync({ gameId });
	};

	const isGameBeingModified = (gameId: string) => {
		return (
			(joinGame.isPending && joinGame.variables?.gameId === gameId) ||
			(leaveGame.isPending && leaveGame.variables?.gameId === gameId)
		);
	};

	return {
		createGame,
		handleJoinGame,
		handleLeaveGame,
		isGameBeingModified,
		deleteGame,
	};
}
