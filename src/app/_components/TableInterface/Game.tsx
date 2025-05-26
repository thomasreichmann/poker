"use client";

import {
	Box,
	Button,
	type ButtonProps,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	Chip,
	Grid,
	Paper,
	Slider,
	styled,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import { type Act } from "~/server/api/routers/player/action";
import { type PublicGame } from "~/server/api/routers/player/player";
import { createClient } from "~/supabase/client";
import { api } from "~/trpc/react";
import DevControls, { type DevControlsRef } from "./DevControls";

export interface GameProps {
	game: PublicGame;
}

const ActionButton = styled((props: ButtonProps) => <Button fullWidth {...props} />)({});

const CommunityCard = styled(Chip)({
	margin: "0 4px",
	fontWeight: "bold",
	fontSize: "1rem",
	height: "36px",
	minWidth: "48px",
});

const InfoChip = styled(Chip)({
	height: "32px",
	fontSize: "1rem",
});

function getNextPlayer(game: PublicGame) {
	const activePlayers = game.players.filter((p) => !p.hasFolded);

	const currentPlayerIndex = activePlayers.findIndex((p) => p.id === game.currentPlayerTurn);

	const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
	const nextPlayer = activePlayers[nextPlayerIndex];

	return nextPlayer;
}

const supabase = createClient();

export default function Game({ game }: GameProps) {
	const utils = api.useUtils();
	const devControlsRef = useRef<DevControlsRef>(null);
	const mutation = api.player.action.act.useMutation({
		onSuccess: async () => {
			await utils.player.getAllGames.invalidate();
			await devControlsRef.current?.handleActionComplete();
		},
		onError: (error) => {
			if (error.message === "Not your turn") {
				console.log("Not your turn");
			}
		},
	});

	const [betAmount, setBetAmount] = useState(100);
	const isOurTurn = game.currentPlayerTurn === game.callerPlayer?.id;

	const handleAct = async (actionData: Act) => {
		// Check if its our turn
		if (!isOurTurn) {
			alert("Not your turn");
			return;
		}

		await mutation.mutateAsync({
			gameId: game.id,
			playerId: game.callerPlayer!.id,
			...actionData,
		});
	};

	const handleActionComplete = async () => {
		await utils.player.getAllGames.invalidate();
	};

	return (
		<Card elevation={4}>
			<CardHeader title={`Game ${game.id}`} />
			<CardContent>
				<Box className="mb-8 flex flex-col gap-4">
					<Box className="flex flex-col items-center gap-2">
						<Box className="flex gap-2">
							<InfoChip label={`Round: ${game.currentRound}`} color="primary" />
							<InfoChip label={`Status: ${game.status}`} color="primary" />
						</Box>
						<InfoChip
							label={`Pot: $${game.pot.toLocaleString()}`}
							color="success"
							variant="filled"
						/>
					</Box>
					<Box className="flex justify-center gap-4">
						{game.communityCards.length === 0 ? (
							<Typography variant="subtitle1" color="text.secondary">
								No community cards
							</Typography>
						) : (
							game.communityCards.map((card, index) => (
								<CommunityCard
									key={index}
									label={`${card.rank} of ${card.suit}`}
									color="primary"
									variant="filled"
								/>
							))
						)}
					</Box>
				</Box>

				<TableContainer component={Paper}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Position</TableCell>
								<TableCell>Player</TableCell>
								<TableCell align="right">Bet</TableCell>
								<TableCell align="center">Status</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{game.players.map((player, i) => {
								const isVacant = player.userId === null;
								const isCurrentPlayer = player.userId === game.callerPlayer?.userId;
								const isHighlighted = player.id === game.currentPlayerTurn;

								return (
									<TableRow
										key={i}
										sx={{
											backgroundColor: isCurrentPlayer
												? "primary.main"
												: isHighlighted
													? "success.main"
													: "inherit",
											color: isCurrentPlayer
												? "secondary.contrastText"
												: isVacant
													? "text.secondary"
													: "inherit",
										}}
									>
										<TableCell className="text-inherit">
											{i}
											{isCurrentPlayer && " (You)"}
											{isHighlighted && " (Active)"}
											{isVacant && " (Vacant)"}
										</TableCell>
										<TableCell className="text-inherit">
											{player.userId?.split("-")[0] ?? "(Vacant)"}
										</TableCell>
										<TableCell className="text-right text-inherit">
											{isVacant
												? "—"
												: `$${(player.currentBet ?? NaN).toLocaleString()}`}
										</TableCell>
										<TableCell className="text-center text-inherit">
											{player.isButton && "🎯 Button"}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>
			</CardContent>
			<CardActions>
				<Grid container spacing={2} className="w-full">
					<Grid size={4}>
						<ActionButton
							variant="contained"
							color="primary"
							onClick={() => handleAct({ action: "check" })}
							disabled={!isOurTurn}
						>
							Check
						</ActionButton>
					</Grid>
					<Grid size={4}>
						<ActionButton
							variant="contained"
							color="error"
							onClick={() => handleAct({ action: "fold" })}
							disabled={!isOurTurn}
						>
							Fold
						</ActionButton>
					</Grid>
					<Grid size={4}>
						<ActionButton
							variant="contained"
							color="warning"
							onClick={() => handleAct({ action: "bet", amount: betAmount })}
							disabled={!isOurTurn}
						>
							Bet {betAmount}
						</ActionButton>
					</Grid>
					<Grid size={4} className="flex w-full gap-4 text-nowrap">
						<Typography>Your stack: ${game.callerPlayer?.stack}</Typography>
						<Typography>Current bet: ${game.currentHighestBet}</Typography>
						<Slider
							min={0}
							max={game.callerPlayer?.stack}
							value={betAmount}
							onChange={(e, value) => setBetAmount(value)}
						/>
					</Grid>
				</Grid>
			</CardActions>
			<CardActions>
				<DevControls
					ref={devControlsRef}
					game={game}
					onActionComplete={handleActionComplete}
				/>
			</CardActions>
		</Card>
	);
}

/**
 * TODO:
 * - Integrate realtime updates to update the game state without making extra requests
 * - Create a better UI to display the game state
 */
