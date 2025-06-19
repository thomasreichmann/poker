"use client";

import { Paper, Typography, Box } from "@mui/material";
import { api } from "~/trpc/react";
import Game from "~/app/_components/TableInterface/Game";

interface SingleGameInterfaceProps {
	gameId: string;
}

export function SingleGameInterface({ gameId }: SingleGameInterfaceProps) {
	const { data: game, isLoading, error } = api.game.getSingle.useQuery({ id: gameId });

	if (isLoading) {
		return (
			<Paper elevation={1} className="m-5 flex h-full flex-col p-5">
				<Typography>Loading game...</Typography>
			</Paper>
		);
	}

	if (error) {
		return (
			<Paper elevation={1} className="m-5 flex h-full flex-col p-5">
				<Typography color="error">
					Error loading game: {error.message}
				</Typography>
			</Paper>
		);
	}

	if (!game) {
		return (
			<Paper elevation={1} className="m-5 flex h-full flex-col p-5">
				<Typography>Game not found</Typography>
			</Paper>
		);
	}

	return (
		<Paper elevation={1} className="m-5 flex h-full flex-col p-5">
			<Box className="flex h-full flex-col">
				<Game game={game} />
			</Box>
		</Paper>
	);
}