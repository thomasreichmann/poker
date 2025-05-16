import { Box, Paper, Skeleton } from "@mui/material";
import { Suspense } from "react";
import { api, HydrateClient } from "~/trpc/server";
import { ClientGameInterface } from "./ClientGameInterface";

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

export default function GameInterface() {
	void api.player.getAllGames.prefetch({ joinedOnly: true });

	return (
		<HydrateClient>
			<Paper elevation={1} className="m-5 flex h-full flex-col p-5">
				<Suspense fallback={<LoadingSkeleton />}>
					<ClientGameInterface />
				</Suspense>
			</Paper>
		</HydrateClient>
	);
}
