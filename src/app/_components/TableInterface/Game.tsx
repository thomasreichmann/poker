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
	Grid2,
	Paper,
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
import { type Action } from "~/server/api/routers/player/action";
import { type PlayerView } from "~/server/api/routers/player/player";
import { type SelectPrivatePlayerStateWithTable } from "~/server/db/schema";
import { api } from "~/trpc/react";
import useDevGameActions from "../DevDashboard/useDevGameActions";
export interface GameProps {
	playerState: SelectPrivatePlayerStateWithTable;
	tableView: PlayerView;
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

function getNextPlayerPosition(table: PlayerView): number {
	const players = table.privatePlayerState;
	if (players.length === 0) return 0;

	const sortedPlayers = [...players].sort((a, b) => a.position - b.position);
	const currentIndex = sortedPlayers.findIndex((player) => player.position === table.currentTurn);
	const startIndex = currentIndex >= 0 ? currentIndex : 0;
	const nextIndex = (startIndex + 1) % sortedPlayers.length;

	while (nextIndex !== startIndex) {
		if (!sortedPlayers[nextIndex]?.folded) {
			const position = sortedPlayers[nextIndex]?.position;
			if (position === undefined) {
				throw new Error("Player position not found");
			}
			return position;
		}
	}

	if (!sortedPlayers[startIndex]?.folded) {
		const position = sortedPlayers[startIndex]?.position;
		if (position === undefined) {
			throw new Error("Player position not found");
		}
		return position;
	}

	return 0;
}

export default function Game({ playerState, tableView }: GameProps) {
	const utils = api.useUtils();
	const mutation = api.player.action.act.useMutation({
		onSuccess: () => {
			void utils.player.tables.invalidate();
		},
		onError: (error) => {
			if (error.message === "Not your turn") {
				console.log("Not your turn");
			}
		},
	});

	const { loginAsUser } = useDevGameActions();

	const [devSwitchUserAfterAction, setDevSwitchUserAfterAction] = useState(true);

	const handleAct = async (actionData: Action) => {
		await mutation.mutateAsync({
			tableId: playerState.publicTable.id,
			...actionData,
		});

		if (devSwitchUserAfterAction) {
			// Next player will be the one after the current player, or the first player if the current player is the last one
			const nextPlayer = getNextPlayerPosition(tableView);
			if (nextPlayer !== playerState.position) {
				const nextPlayerEmail = tableView.privatePlayerState[nextPlayer]?.user.email;
				if (nextPlayerEmail) {
					await loginAsUser(nextPlayerEmail);
				} else {
					throw new Error("Next player email not found");
				}
			}
		}
	};

	return (
		<Card elevation={4}>
			<CardHeader title={`Game ${playerState.publicTable.id}`} />
			<CardContent>
				<Box className="mb-8 flex flex-col gap-4">
					<Box className="flex justify-center gap-2">
						<FormControlLabel
							control={
								<Checkbox
									checked={devSwitchUserAfterAction}
									onChange={(e) => setDevSwitchUserAfterAction(e.target.checked)}
								/>
							}
							label="Switch user after action"
						/>
					</Box>
					<Box className="flex justify-center">
						<InfoChip
							label={`Pot: $${playerState.publicTable.pot.toLocaleString()}`}
							color="success"
							variant="filled"
						/>
					</Box>
					<Box className="flex justify-center gap-4">
						{playerState.publicTable.communityCards.length === 0 ? (
							<Typography variant="subtitle1" color="text.secondary">
								No community cards
							</Typography>
						) : (
							playerState.publicTable.communityCards.map((card, index) => (
								<CommunityCard
									key={index}
									label={card}
									color={
										card.endsWith("♥") || card.endsWith("♦")
											? "error"
											: "default"
									}
									variant="filled"
								/>
							))
						)}
					</Box>
				</Box>

				<TableContainer component={Paper}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Seat</TableCell>
								<TableCell>Name</TableCell>
								<TableCell className="text-right">Stack</TableCell>
								<TableCell className="text-right">Current Bet</TableCell>
								<TableCell className="text-center">Position</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{playerState.publicTable.stacks.map((stack, i) => {
								const isVacant = stack === null || Number.isNaN(stack);
								const isHighlighted =
									i === playerState.position ||
									i === playerState.publicTable.currentTurn;

								return (
									<TableRow
										key={i}
										sx={{
											backgroundColor:
												i === playerState.position
													? "primary.main"
													: i === playerState.publicTable.currentTurn
														? "success.main"
														: "inherit",
											color:
												i === playerState.position ||
												i === playerState.publicTable.currentTurn
													? "secondary.contrastText"
													: isVacant
														? "text.disabled"
														: "inherit",
											fontStyle: isVacant ? "italic" : "normal",
										}}
									>
										<TableCell className="text-inherit">
											{i}
											{i === playerState.position && " (You)"}
											{i === playerState.publicTable.currentTurn &&
												" (Active)"}
											{isVacant && " (Vacant)"}
										</TableCell>
										<TableCell className="text-inherit">
											{tableView.privatePlayerState[i]?.user.email.split(
												"@",
											)[0] ?? "(Vacant)"}
										</TableCell>
										<TableCell className="text-right text-inherit">
											{isVacant ? "—" : `$${stack.toLocaleString()}`}
										</TableCell>
										<TableCell className="text-right text-inherit">
											{isVacant
												? "—"
												: `$${(playerState.publicTable.bets[i] ?? NaN).toLocaleString()}`}
										</TableCell>
										<TableCell className="text-center text-inherit">
											{i === playerState.publicTable.button && "🎯 Button"}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>
			</CardContent>
			<CardActions>
				<Grid2 container spacing={2} className="w-full">
					<Grid2 size={6}>
						<ActionButton
							variant="contained"
							onClick={() => handleAct({ action: "check" })}
						>
							Check
						</ActionButton>
					</Grid2>
					<Grid2 size={6}>
						<ActionButton
							variant="contained"
							onClick={() => handleAct({ action: "bet", amount: 100 })}
						>
							Bet
						</ActionButton>
					</Grid2>
					<Grid2 size={12}>
						<ActionButton
							variant="contained"
							onClick={() => handleAct({ action: "fold" })}
						>
							Fold
						</ActionButton>
					</Grid2>
				</Grid2>
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
