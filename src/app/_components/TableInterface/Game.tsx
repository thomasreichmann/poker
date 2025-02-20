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
import { type SelectPrivatePlayerStateWithTable } from "~/server/db/schema";

export interface GameProps {
	playerState: SelectPrivatePlayerStateWithTable;
}

const ActionButton = styled((props: ButtonProps) => <Button fullWidth {...props} />)({});

export default function Game({ playerState }: GameProps) {
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
			</CardContent>
			<CardActions>
				<Grid2 container spacing={2}>
					<Grid2 size={6}>
						<ActionButton variant="contained">Check</ActionButton>
					</Grid2>
					<Grid2 size={6}>
						<ActionButton variant="contained">Bet</ActionButton>
					</Grid2>
					<Grid2 size={12}>
						<ActionButton variant="contained">Fold</ActionButton>
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
