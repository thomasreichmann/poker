import { Box, Paper, Skeleton, Typography } from "@mui/material";
import { Suspense } from "react";
import { api, HydrateClient } from "~/trpc/server";
import { ClientTableInterface } from "./ClientTableInterface";

function LoadingSkeleton() {
	return (
		<>
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
			</Box>
			<Box sx={{ p: 3 }}>
				<Box className="flex min-h-[400px] w-full items-center justify-center rounded-lg">
					<Skeleton variant="rectangular" width="100%" height={400} />
				</Box>
			</Box>
		</>
	);
}

export default function TableInterface() {
	void api.player.tables.prefetch();

	return (
		<HydrateClient>
			<Paper elevation={1} className="m-5 flex-1 p-5">
				<Typography variant="h4" className="mb-4">
					Poker Tables
				</Typography>
				<Suspense fallback={<LoadingSkeleton />}>
					<ClientTableInterface />
				</Suspense>
			</Paper>
		</HydrateClient>
	);
}
