"use client";

import { type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "~/supabase/client";

const supabase = createClient();

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, string>>;

export const RealtimeTest = () => {
	const [messages, setMessages] = useState<RealtimePayload[]>([]);

	useEffect(() => {
		console.log("setting up realtime");
		const channel = supabase
			.channel("schema-db-changes")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
				},
				(payload: RealtimePayload) => {
					console.log("got a payload", payload);
					setMessages((prev) => [...prev, payload]);
				},
			)
			.subscribe();

		return () => {
			console.log("tearing down realtime");
			void channel.unsubscribe();
		};
	}, []);

	return (
		<div>
			<h3>Realtime Updates</h3>
			{messages.length > 0 ? (
				<RealtimeTable messages={messages} />
			) : (
				<p>No changes detected</p>
			)}
		</div>
	);
};

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

const RealtimeTable = ({ messages }: { messages: RealtimePayload[] }) => {
	const getChangedFields = (oldData: Record<string, string>, newData: Record<string, string>) => {
		if (!oldData || !newData) return "No Data";
		// Check if oldData has only the id field (meaning that table replication is not full and old data is not available)
		if (Object.keys(oldData).length === 1 && oldData.id) {
			return "Previous data not available";
		}
		const changes = [];
		for (const key in newData) {
			if (newData[key] !== oldData[key]) {
				changes.push(key);
			}
		}
		return changes.length ? changes.join(", ") : "No Changes";
	};

	return (
		<TableContainer component={Paper}>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell>Change Type</TableCell>
						<TableCell>Table</TableCell>
						<TableCell>Data</TableCell>
						<TableCell>Changed Fields</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{messages.map((msg, index) => (
						<TableRow key={index}>
							<TableCell>{msg.eventType || "Unknown"}</TableCell>
							<TableCell>{msg.table || "Untitled"}</TableCell>
							<TableCell>{JSON.stringify(msg.new)}</TableCell>
							<TableCell>
								{getChangedFields(msg.old as Record<string, string>, msg.new)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};
