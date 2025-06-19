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
import { useEffect, useState } from "react";
import { type Act } from "~/server/api/routers/player/action";
import { type PublicGame } from "~/server/api/routers/player/player";
import { api } from "~/trpc/react";
import useDevGameActions from "../DevDashboard/useDevGameActions";
import PlayingCard from "./PlayingCard";

export interface GameProps {
	game: PublicGame;
}

const ActionButton = styled((props: ButtonProps) => <Button fullWidth {...props} />)({});

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

export default function Game({ game }: GameProps) {
	const utils = api.useUtils();
	const {
		loginAsUser,
		loading: loginAsUserLoading,
		advanceGame,
		advanceGameLoading,
	} = useDevGameActions();
	const [devSwitchUserAfterAction, setDevSwitchUserAfterAction] = useState<boolean>(false);
	const resetGameMutation = api.admin.resetGame.useMutation();
	const mutation = api.player.action.act.useMutation({
		onSuccess: async () => {
			await utils.player.getAllGames.invalidate();
			await handleActionComplete();
		},
		onError: (error) => {
			if (error.message === "Not your turn") {
				console.log("Not your turn");
			}
		},
	});

	useEffect(() => {
		const saved = localStorage.getItem("devSwitchUserAfterAction");
		setDevSwitchUserAfterAction(saved ? (JSON.parse(saved) as boolean) : false);
	}, []);

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
			...actionData,
		});
	};

	const handleActionComplete = async () => {
		if (devSwitchUserAfterAction) {
			const nextPlayer = getNextPlayer(game);
			if (nextPlayer) {
				await loginAsUser(nextPlayer.userId);
			}
		}
		await utils.player.getAllGames.invalidate();
	};

	const handleResetGame = async () => {
		try {
			await resetGameMutation.mutateAsync({ gameId: game.id });
			await handleActionComplete();
		} catch (error) {
			console.error("Failed to reset game:", error);
		}
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
					{game.communityCards.length === 0 ? (
						<Typography variant="subtitle1" color="text.secondary">
							No community cards
						</Typography>
					) : (
						<Box className="flex justify-center gap-4">
							{game.communityCards.map((card, index) => (
								<PlayingCard key={index} card={card} />
							))}
						</Box>
					)}
				</Box>

				<TableContainer component={Paper}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Position</TableCell>
								<TableCell>Player</TableCell>
								<TableCell>Stack</TableCell>
								<TableCell align="right">Bet</TableCell>
								<TableCell align="center">Status</TableCell>
								<TableCell align="center">Hand</TableCell>
								{game.status === "completed" && (
									<TableCell align="center">Result</TableCell>
								)}
							</TableRow>
						</TableHead>
						<TableBody>
							{game.players
								.sort((a, b) => a.seat - b.seat)
								.map((player, i) => {
									const isVacant = player.userId === null;
									const isCurrentPlayer =
										player.userId === game.callerPlayer?.userId;
									const isHighlighted = player.id === game.currentPlayerTurn;
									const showCards =
										game.status === "completed"
											? isCurrentPlayer
												? true
												: player.showCards
											: isCurrentPlayer;

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
												{player.seat}
												{isCurrentPlayer && " (You)"}
												{isHighlighted && " (Active)"}
												{isVacant && " (Vacant)"}
											</TableCell>
											<TableCell className="text-inherit">
												{player.userId?.split("-")[0] ?? "(Vacant)"}
											</TableCell>
											<TableCell className="text-inherit">
												${player.stack?.toLocaleString()}
											</TableCell>
											<TableCell className="text-right text-inherit">
												{isVacant
													? "—"
													: `$${(player.currentBet ?? 0).toLocaleString()}`}
											</TableCell>
											<TableCell className="text-center text-inherit">
												{player.isButton && "🎯 Button"}
												{player.hasFolded && "🃏 Folded"}
											</TableCell>
											<TableCell className="text-center text-inherit">
												{showCards ? (
													<Box className="flex justify-center gap-2">
														{player.cards?.map((card) => (
															<PlayingCard
																key={card.id}
																card={card}
															/>
														))}
													</Box>
												) : (
													<Box className="flex justify-center gap-2">
														<PlayingCard showBack />
														<PlayingCard showBack />
													</Box>
												)}
											</TableCell>
											{game.status === "completed" && (
												<TableCell className="text-center text-inherit">
													{player.hasWon && "🏆 Winner"}
													{showCards && player.handName && (
														<Typography
															variant="body2"
															color="text.secondary"
														>
															{player.handName}
														</Typography>
													)}
												</TableCell>
											)}
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
				<div className="flex gap-2">
					<FormControlLabel
						control={
							<Checkbox
								checked={devSwitchUserAfterAction}
								onChange={(e) => {
									setDevSwitchUserAfterAction(e.target.checked);
									localStorage.setItem(
										"devSwitchUserAfterAction",
										JSON.stringify(e.target.checked),
									);
								}}
							/>
						}
						label="Switch user after action"
					/>
					<Button
						variant="contained"
						color="warning"
						onClick={handleResetGame}
						disabled={resetGameMutation.isPending}
					>
						{resetGameMutation.isPending ? "Resetting..." : "Reset Game"}
					</Button>
					<Button
						variant="contained"
						color="primary"
						disabled={!game.currentPlayerTurn}
						loading={loginAsUserLoading}
						onClick={() => loginAsUser(game.currentPlayerTurn!)}
					>
						Switch to active player
					</Button>
					<Button
						variant="contained"
						color="primary"
						onClick={() => {
							advanceGame({ gameId: game.id });
						}}
						loading={advanceGameLoading}
					>
						Advance Game
					</Button>
				</div>
			</CardActions>
		</Card>
	);
}

/**
 * TODO:
 * - Create a better UI to display the game state
 * - Add visual indicators for realtime connection status
 * - Optimize performance for large numbers of concurrent games
 */
