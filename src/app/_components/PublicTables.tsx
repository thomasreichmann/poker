"use client";
import {
	Button,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import { SelectPublicTable } from "~/server/db/schema";

interface PublicTablesProps {
	tables: SelectPublicTable[];
	joinTable?: (table: SelectPublicTable) => void;
}

export function PublicTables({ tables, joinTable }: PublicTablesProps) {
	return (
		<TableContainer component={Paper}>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell>ID</TableCell>
						<TableCell>Created At</TableCell>
						<TableCell>Pot</TableCell>
						<TableCell>Current Turn</TableCell>
						<TableCell>Button</TableCell>
						<TableCell />
					</TableRow>
				</TableHead>
				<TableBody>
					{tables.map((table) => (
						<TableRow key={table.id}>
							<TableCell>{table.id}</TableCell>
							<TableCell>{table.createdAt.toISOString()}</TableCell>
							<TableCell>{table.pot}</TableCell>
							<TableCell>{table.currentTurn}</TableCell>
							<TableCell>{table.button}</TableCell>
							<TableCell>
								<Button variant="outlined" onClick={() => joinTable?.(table)}>
									Join
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}
