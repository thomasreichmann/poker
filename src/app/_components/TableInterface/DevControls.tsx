import { Button, Checkbox, FormControlLabel } from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { type PublicGame } from "~/server/api/routers/player/player";
import { api } from "~/trpc/react";
import useDevGameActions from "../DevDashboard/useDevGameActions";

interface DevControlsProps {
	game: PublicGame;
	onActionComplete?: () => Promise<void>;
}

export interface DevControlsRef {
	handleActionComplete: () => Promise<void>;
}

const DevControls = forwardRef<DevControlsRef, DevControlsProps>(
	({ game, onActionComplete }, ref) => {
		const { loginAsUser } = useDevGameActions();
		const [devSwitchUserAfterAction, setDevSwitchUserAfterAction] = useState<boolean>(false);
		const resetGameMutation = api.admin.resetGame.useMutation();

		useEffect(() => {
			const saved = localStorage.getItem("devSwitchUserAfterAction");
			setDevSwitchUserAfterAction(saved ? (JSON.parse(saved) as boolean) : false);
		}, []);

		const getNextPlayer = (game: PublicGame) => {
			const activePlayers = game.players.filter((p) => !p.hasFolded);
			const currentPlayerIndex = activePlayers.findIndex(
				(p) => p.id === game.currentPlayerTurn,
			);
			const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
			return activePlayers[nextPlayerIndex];
		};

		const handleActionComplete = async () => {
			if (devSwitchUserAfterAction) {
				const nextPlayer = getNextPlayer(game);
				if (nextPlayer) {
					await loginAsUser(nextPlayer.userId);
				}
			}
			await onActionComplete?.();
		};

		useImperativeHandle(ref, () => ({
			handleActionComplete,
		}));

		const handleResetGame = async () => {
			try {
				await resetGameMutation.mutateAsync({ gameId: game.id });
				await onActionComplete?.();
			} catch (error) {
				console.error("Failed to reset game:", error);
			}
		};

		return (
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
					onClick={() => loginAsUser(game.currentPlayerTurn!)}
				>
					Switch to active player
				</Button>
			</div>
		);
	},
);

DevControls.displayName = "DevControls";

export default DevControls;
export type { DevControlsProps };
