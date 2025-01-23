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
} from "@mui/material";
import { SelectPublicTable } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function PublicTablesComponent() {
	const utils = api.useUtils();
	const [tables] = api.table.get.useSuspenseQuery();

	const joinTableMutation = api._old_table.joinTable.useMutation({
		onSuccess: () => {
			utils._old_table.invalidate();
		},
	});

	const joinTable = async (table: SelectPublicTable) => {
		const res = await joinTableMutation.mutateAsync({ tableId: table.id });
		console.log(res);
	};

	return (
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
									onClick={() => joinTable?.(table)}
									disabled={joinTableMutation.isPending}
								>
									Join
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}
