"use client";

import { Box, Paper, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { api } from "~/trpc/react";
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
			id={`table-tabpanel-${index}`}
			aria-labelledby={`table-tab-${index}`}
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

export function ClientTableInterface() {
	const [currentTable, setCurrentTable] = useState(0);
	const [playerStates] = api.player.tables.useSuspenseQuery();
	const [tableViews] = api.player.playerViews.useSuspenseQuery();
	const tables = playerStates.map((state) => state.publicTable);

	const handleTableChange = (event: React.SyntheticEvent, newValue: number) => {
		setCurrentTable(newValue);
	};

	return (
		<Box className="flex grow flex-col">
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs
					value={currentTable}
					onChange={handleTableChange}
					aria-label="poker tables"
					variant="scrollable"
					scrollButtons="auto"
				>
					{tables.map((table, index) => (
						<Tab
							key={table.id}
							label={`${table.id} (N/A players)`}
							id={`table-tab-${index}`}
							aria-controls={`table-tabpanel-${index}`}
						/>
					))}
				</Tabs>
			</Box>

			{tables.map((table, index) => (
				<TabPanel key={table.id} value={currentTable} index={index}>
					<Game
						playerState={
							playerStates.find((state) => state.publicTable.id === table.id)!
						}
						tableView={tableViews.find((view) => view.id === table.id)!}
					/>
				</TabPanel>
			))}
		</Box>
	);
}
