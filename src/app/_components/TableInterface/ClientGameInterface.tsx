"use client";

import { Box, Paper, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { api } from "~/trpc/react";
import { usePokerRealtime, RealtimeStatus } from "../Realtime";
import Game from "./Game";

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
	className?: string;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`game-tabpanel-${index}`}
			aria-labelledby={`game-tab-${index}`}
			className={`flex flex-col ${value === index ? "h-full" : ""}`}
			{...other}
		>
			{value === index && (
				<Paper
					elevation={2}
					className={`flex h-full flex-col items-center justify-center p-3 ${props.className}`}
				>
					{children}
				</Paper>
			)}
		</div>
	);
}

export function ClientGameInterface() {
	const [currentGame, setCurrentGame] = useState(0);
	const [games] = api.player.getAllGames.useSuspenseQuery({ joinedOnly: true });
	
	// Enable realtime updates for game state
	const realtimeStatus = usePokerRealtime();

	const handleGameChange = (event: React.SyntheticEvent, newValue: number) => {
		setCurrentGame(newValue);
	};

	return (
		<Box className="flex grow flex-col">
			<Box sx={{ borderBottom: 1, borderColor: "divider" }} className="flex items-center justify-between px-2">
				<Tabs
					value={currentGame}
					onChange={handleGameChange}
					aria-label="poker games"
					variant="scrollable"
					scrollButtons="auto"
				>
					{games.map((game, index) => (
						<Tab
							key={game.id}
							label={`${game.id} (N/A players)`}
							id={`game-tab-${index}`}
							aria-controls={`game-tabpanel-${index}`}
						/>
					))}
				</Tabs>
				<RealtimeStatus status={realtimeStatus} />
			</Box>

			{games.map((game, index) => (
				<TabPanel key={game.id} value={currentGame} index={index}>
					<Game game={game} />
				</TabPanel>
			))}
		</Box>
	);
}
