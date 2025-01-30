import { api } from "~/trpc/react";

export function useTableMutations() {
	const utils = api.useUtils();

	const invalidateTables = async () => {
		await utils.table.get.invalidate();
	};

	const createTable = api.table.create.useMutation({
		onSuccess: invalidateTables,
	});

	const joinTable = api.table.join.useMutation({
		onSuccess: invalidateTables,
	});

	const leaveTable = api.table.leave.useMutation({
		onSuccess: invalidateTables,
	});

	const handleJoinTable = async (tableId: number) => {
		await joinTable.mutateAsync({ tableId });
	};

	const handleLeaveTable = async (tableId: number) => {
		await leaveTable.mutateAsync({ tableId });
	};

	const isTableBeingModified = (tableId: number) => {
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
