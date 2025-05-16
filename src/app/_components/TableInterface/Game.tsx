"use client";

import {
	Box,
	Button,
	type ButtonProps,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	Checkbox,
	Chip,
	FormControlLabel,
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
import { useState } from "react";
import { type Act } from "~/server/api/routers/player/action";
import { type PublicGame } from "~/server/api/routers/player/player";
import { createClient } from "~/supabase/client";
import { api } from "~/trpc/react";
import useDevGameActions from "../DevDashboard/useDevGameActions";

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
	const mutation = api.player.action.act.useMutation({
		onSuccess: () => {
			void utils.player.getAllGames.invalidate();
		},
		onError: (error) => {
			if (error.message === "Not your turn") {
				console.log("Not your turn");
			}
		},
	});

	const [betAmount, setBetAmount] = useState(100);

	const { loginAsUser } = useDevGameActions();

	const [devSwitchUserAfterAction, setDevSwitchUserAfterAction] = useState(true);

	const handleAct = async (actionData: Act) => {
		await mutation.mutateAsync({
			gameId: game.id,
			playerId: game.callerPlayer!.userId,
			...actionData,
		});

		if (devSwitchUserAfterAction) {
			const nextPlayer = getNextPlayer(game);
			if (nextPlayer) {
				await loginAsUser(nextPlayer.userId);
			}
		}
	};

	return (
		<Card elevation={4}>
			<CardHeader title={`Game ${game.id}`} />
			<CardContent>
				<Box className="mb-8 flex flex-col gap-4">
					<Box className="flex justify-center">
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
								<TableCell align="right">Stack</TableCell>
								<TableCell align="center">Status</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{game.players.map((player, i) => {
								const isVacant = player.userId === null;
								const isCurrentPlayer = player.userId === game.callerPlayer?.userId;
								const isHighlighted =
									isCurrentPlayer || i === Number(game.currentPlayerTurn);

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
											{player.userId?.split("@")[0] ?? "(Vacant)"}
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
						>
							Check
						</ActionButton>
					</Grid>
					<Grid size={4}>
						<ActionButton
							variant="contained"
							color="error"
							onClick={() => handleAct({ action: "fold" })}
						>
							Fold
						</ActionButton>
					</Grid>
					<Grid size={4}>
						<ActionButton
							variant="contained"
							color="warning"
							onClick={() => handleAct({ action: "bet", amount: betAmount })}
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
				<FormControlLabel
					control={
						<Checkbox
							checked={devSwitchUserAfterAction}
							onChange={(e) => setDevSwitchUserAfterAction(e.target.checked)}
						/>
					}
					label="Switch user after action"
				/>
			</CardActions>
		</Card>
	);
}

/**
 * TODO:
 * - Create endpoints for player actions, this can be a sub-router of the player.
 *  - Bet x
 *  - Fold
 *  - Check
 * - Create a UI for the player to make actions
 * - Integrate realtime updates to update the game state without making extra requests
 * - Create a better UI to display the game state
 */
