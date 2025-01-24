"use client";

import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`table-tabpanel-${index}`}
			aria-labelledby={`table-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	);
}

// Mock data for tables - replace with real data later
const mockTables = [
	{ id: 1, name: "Table 1", players: 6 },
	{ id: 2, name: "Table 2", players: 4 },
	{ id: 3, name: "Table 3", players: 8 },
];

export function ClientTableInterface() {
	const [currentTable, setCurrentTable] = useState(0);

	const handleTableChange = (event: React.SyntheticEvent, newValue: number) => {
		setCurrentTable(newValue);
	};

	return (
		<Paper elevation={1} className="m-5 p-5">
			<Typography variant="h4" className="mb-4">
				Poker Tables
			</Typography>

			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs
					value={currentTable}
					onChange={handleTableChange}
					aria-label="poker tables"
					variant="scrollable"
					scrollButtons="auto"
				>
					{mockTables.map((table, index) => (
						<Tab
							key={table.id}
							label={`${table.name} (${table.players} players)`}
							id={`table-tab-${index}`}
							aria-controls={`table-tabpanel-${index}`}
						/>
					))}
				</Tabs>
			</Box>

			{mockTables.map((table, index) => (
				<TabPanel key={table.id} value={currentTable} index={index}>
					<Box className="flex min-h-[400px] w-full items-center justify-center rounded-lg bg-green-800">
						<Typography color="white">
							Poker Table {table.id} - {table.players} players
						</Typography>
					</Box>
				</TabPanel>
			))}
		</Paper>
	);
}
