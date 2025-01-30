"use client";
import {
	Button,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import { api } from "~/trpc/react";
import { useTableMutations } from "./useTableMutations";

export function PublicTablesComponent() {
	const [tables] = api.table.get.useSuspenseQuery();
	const { createTable, handleJoinTable, handleLeaveTable, isTableBeingModified } =
		useTableMutations();

	return (
		<Stack spacing={2}>
			<Button
				variant="contained"
				onClick={() => createTable.mutateAsync()}
				disabled={createTable.isPending}
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
										onClick={() =>
											table.isUserInTable
												? handleLeaveTable(table.id)
												: handleJoinTable(table.id)
										}
										disabled={isTableBeingModified(table.id)}
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
