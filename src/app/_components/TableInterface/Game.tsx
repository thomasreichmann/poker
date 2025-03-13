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

export default function Game({ playerState, tableView }: GameProps) {
	const utils = api.useUtils();
	const mutation = api.player.action.act.useMutation({
		onSuccess: () => {
			void utils.player.tables.invalidate();
		},
	});

	const [lastResult, setLastResult] = useState<string | null>(null);

	const handleAct = async (actionData: Action) => {
		const result = await mutation.mutateAsync({
			tableId: playerState.publicTable.id,
			...actionData,
		});
		setLastResult(JSON.stringify(result));
	};

	const currentPlayer = (table: PlayerView) => {
		return "123";
	};

	return (
		<Card elevation={4}>
			<CardHeader title={`Game ${playerState.publicTable.id}`} />
			<CardContent>
				<TableContainer component={Paper} sx={{ mt: 2 }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell colSpan={4} sx={{ borderBottom: "none" }}>
									<Box sx={{ display: "flex", justifyContent: "center" }}>
										<InfoChip
											label={`Pot: $${playerState.publicTable.pot.toLocaleString()}`}
											color="success"
											variant="filled"
										/>
									</Box>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell
									colSpan={4}
									sx={{ borderBottom: "none", textAlign: "center" }}
								>
									<Box
										sx={{
											display: "flex",
											justifyContent: "center",
											gap: 1,
											my: 1,
										}}
									>
										{playerState.publicTable.communityCards.length === 0 ? (
											<Typography variant="subtitle1" color="text.secondary">
												No community cards
											</Typography>
										) : (
											playerState.publicTable.communityCards.map(
												(card, index) => (
													<CommunityCard
														key={index}
														label={card}
														color={
															card.endsWith("♥") ||
															card.endsWith("♦")
																? "error"
																: "default"
														}
														variant="filled"
													/>
												),
											)
										)}
									</Box>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>Seat</TableCell>
								<TableCell align="right">Stack</TableCell>
								<TableCell align="right">Current Bet</TableCell>
								<TableCell align="center">Position</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{playerState.publicTable.stacks.map((stack, i) => {
								const isVacant = stack === null || Number.isNaN(stack);
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
										<TableCell className="text-inherit" align="right">
											{isVacant ? "—" : `$${stack.toLocaleString()}`}
										</TableCell>
										<TableCell className="text-inherit" align="right">
											{isVacant
												? "—"
												: `$${(playerState.publicTable.bets[i] ?? 0).toLocaleString()}`}
										</TableCell>
										<TableCell className="text-inherit" align="center">
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
				<Grid2 container spacing={2}>
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
