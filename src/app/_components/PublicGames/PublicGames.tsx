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
import { usePokerRealtime } from "../Realtime/usePokerRealtime";
import { useGameMutations } from "./useGameMutations";

export function PublicGamesComponent() {
	const [games] = api.player.getAllGames.useSuspenseQuery();
	const { handleJoinGame, handleLeaveGame, isGameBeingModified, createGame, deleteGame } =
		useGameMutations();

	// Enable realtime updates for games list
	const realtimeStatus = usePokerRealtime();

	return (
		<Stack spacing={2}>
			<Button
				variant="contained"
				onClick={() => createGame.mutateAsync()}
				disabled={createGame.isPending}
			>
				Create New Game
			</Button>

			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>ID</TableCell>
							<TableCell>Pot</TableCell>
							<TableCell>Current Turn</TableCell>
							<TableCell>Status</TableCell>
							<TableCell>Actions</TableCell>
							<TableCell>Delete</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{games.map((game) => (
							<TableRow key={game.id}>
								<TableCell>{game.id}</TableCell>
								<TableCell>{game.pot}</TableCell>
								<TableCell>{game.currentPlayerTurn}</TableCell>
								<TableCell>{game.status}</TableCell>
								<TableCell>
									{game.hasJoined ? (
										<Button
											variant="contained"
											color="error"
											onClick={() => handleLeaveGame(game.id)}
											disabled={isGameBeingModified(game.id)}
										>
											Leave
										</Button>
									) : (
										<Button
											variant="contained"
											color="success"
											onClick={() => handleJoinGame(game.id)}
											disabled={isGameBeingModified(game.id)}
										>
											Join
										</Button>
									)}
								</TableCell>
								<TableCell>
									<Button
										variant="contained"
										color="error"
										onClick={() => deleteGame.mutateAsync({ id: game.id })}
										disabled={deleteGame.isPending}
									>
										Delete
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
