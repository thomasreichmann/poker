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
import { useGameMutations } from "./useTableMutations";

export function PublicTablesComponent() {
	const [tables] = api.player.getAllGames.useSuspenseQuery();
	const { createTable, handleJoinTable, handleLeaveTable, isTableBeingModified } =
		useGameMutations();

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
							<TableCell>In/Out</TableCell>
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{tables.map((table) => (
							<TableRow key={table.id}>
								<TableCell>{table.id}</TableCell>
								<TableCell>{table.pot}</TableCell>
								<TableCell>{table.currentPlayerTurn}</TableCell>
								<TableCell>{table.hasJoined ? "In" : "Out"}</TableCell>
								<TableCell>
									<Button
										variant="outlined"
										onClick={() =>
											table.hasJoined
												? handleLeaveTable(table.id)
												: handleJoinTable(table.id)
										}
										disabled={isTableBeingModified(table.id)}
									>
										{table.hasJoined ? "Leave" : "Join"}
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
