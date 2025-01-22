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
import { SelectPrivatePlayerState } from "~/server/db/schema";
import { api } from "~/trpc/react";

export function PrivateTables() {
	const utils = api.useUtils();
	const [tables] = api.table.playerTables.useSuspenseQuery();

	const leaveMutation = api.table.leaveTable.useMutation({
		onSuccess: () => {
			utils.table.invalidate();
		},
	});

	const leaveTable = async (table: SelectPrivatePlayerState) => {
		leaveMutation.mutateAsync({ tableId: table.tableId });
	};

	return (
		<TableContainer component={Paper}>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell>ID</TableCell>
						<TableCell>Table ID</TableCell>
						<TableCell>Created At</TableCell>
						<TableCell>Hand</TableCell>
						<TableCell />
					</TableRow>
				</TableHead>
				<TableBody>
					{tables.map((table) => (
						<TableRow key={table.id}>
							<TableCell>{table.id}</TableCell>
							<TableCell>{table.tableId}</TableCell>
							<TableCell>{table.createdAt.toISOString()}</TableCell>
							<TableCell>{table.hand}</TableCell>
							<TableCell>
								<Button
									variant="outlined"
									onClick={() => leaveTable(table)}
									disabled={leaveMutation.isPending}
								>
									Leave
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}
