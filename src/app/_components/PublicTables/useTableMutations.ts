import { api } from "~/trpc/react";

export function useGameMutations() {
	const utils = api.useUtils();

	const invalidateTables = async () => {
		await utils.game.getAll.invalidate();
		await utils.player.getAllGames.invalidate();
	};

	const createTable = api.game.create.useMutation({
		onSuccess: invalidateTables,
	});

	const joinTable = api.game.join.useMutation({
		onSuccess: invalidateTables,
	});

	const leaveTable = api.game.leave.useMutation({
		onSuccess: invalidateTables,
	});

	const handleJoinTable = async (tableId: string) => {
		await joinTable.mutateAsync({ tableId });
	};

	const handleLeaveTable = async (tableId: string) => {
		await leaveTable.mutateAsync({ tableId });
	};

	const isTableBeingModified = (tableId: string) => {
		return (
			(joinTable.isPending && joinTable.variables?.tableId === tableId) ||
			(leaveTable.isPending && leaveTable.variables?.tableId === tableId)
		);
	};

	return {
		createTable,
		handleJoinTable,
		handleLeaveTable,
		isTableBeingModified,
	};
}
