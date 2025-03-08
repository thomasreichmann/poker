"use client";

import {
	Button,
	type ButtonProps,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	Grid2,
	styled,
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
		setLastResult(result);
	};

	const currentPlayer = (table: PlayerView) => {
		return "123";
	};

	return (
		<Card elevation={4}>
			<CardHeader title={`Game ${playerState.publicTable.id}`} />
			<CardContent>
				<Typography variant="h6">Pot: {playerState.publicTable.pot}</Typography>
				<Typography variant="h6">
					Current Turn: {playerState.publicTable.currentTurn}
				</Typography>
				<Typography variant="h6">Your seat: {playerState.position}</Typography>
				<Typography variant="h6">Button: {playerState.publicTable.button}</Typography>
				<Typography variant="h6">Current Player: {currentPlayer(tableView)}</Typography>
				{lastResult && <Typography variant="h6">{lastResult}</Typography>}
				<Typography variant="h6">
					Community Cards: {playerState.publicTable.communityCards.join(", ")}
				</Typography>
				<Typography variant="h6">
					Small Blind: {playerState.publicTable.smallBlind}
				</Typography>
				<Typography variant="h6">Big Blind: {playerState.publicTable.bigBlind}</Typography>
				<Typography variant="h6">
					Stacks:{" "}
					{playerState.publicTable.stacks.map((stack, i) => (
						<Typography key={i} component="span">
							{i > 0 && ", "}
							<Typography
								color={i === playerState.position ? "primary" : "inherit"}
								component="span"
							>
								{stack}
							</Typography>
						</Typography>
					))}
				</Typography>
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
