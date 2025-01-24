"use client";
import {
	Button,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Stack,
} from "@mui/material";
import { SelectPublicTable } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function PublicTablesComponent() {
	const utils = api.useUtils();
	const [tables] = api.table.get.useSuspenseQuery();

	const createTableMutation = api.table.create.useMutation({
		onSuccess: async () => {
			await utils.table.get.invalidate();
		},
	});

	const joinTableMutation = api.table.join.useMutation({
		onSuccess: async () => {
			await utils.table.get.invalidate();
		},
	});

	const leaveTableMutation = api.table.leave.useMutation({
		onSuccess: async () => {
			await utils.table.get.invalidate();
		},
	});

	const handleTableAction = async (table: SelectPublicTable & { isUserInTable: boolean }) => {
		if (table.isUserInTable) {
			await leaveTableMutation.mutateAsync({ tableId: table.id });
		} else {
			await joinTableMutation.mutateAsync({ tableId: table.id });
		}
	};

	const handleCreateTable = async () => {
		await createTableMutation.mutateAsync();
	};

	const isTableActionDisabled = (table: SelectPublicTable & { isUserInTable: boolean }) => {
		if (table.isUserInTable) {
			return (
				leaveTableMutation.isPending && leaveTableMutation.variables?.tableId === table.id
			);
		}
		return joinTableMutation.isPending && joinTableMutation.variables?.tableId === table.id;
	};

	return (
		<Stack spacing={2}>
			<Button
				variant="contained"
				onClick={handleCreateTable}
				disabled={createTableMutation.isPending}
			>
				Create New Table
			</Button>

			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>ID</TableCell>
							<TableCell>Created At</TableCell>
							<TableCell>Pot</TableCell>
							<TableCell>Current Turn</TableCell>
							<TableCell>Button</TableCell>
							<TableCell>In/Out</TableCell>
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{tables.map((table) => (
							<TableRow key={table.id}>
								<TableCell>{table.id}</TableCell>
								<TableCell>{table.createdAt.toISOString()}</TableCell>
								<TableCell>{table.pot}</TableCell>
								<TableCell>{table.currentTurn}</TableCell>
								<TableCell>{table.button}</TableCell>
								<TableCell>{table.isUserInTable ? "In" : "Out"}</TableCell>
								<TableCell>
									<Button
										variant="outlined"
										onClick={() => handleTableAction(table)}
										disabled={isTableActionDisabled(table)}
									>
										{table.isUserInTable ? "Leave" : "Join"}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Stack>
	);
}
