import { Suspense } from "react";
import { api, HydrateClient } from "~/trpc/server";
import { SingleGameInterface } from "./SingleGameInterface";
import { Box, Paper, Skeleton } from "@mui/material";

export const dynamic = "force-dynamic";

function LoadingSkeleton() {
	return (
		<Paper elevation={1} className="m-5 flex h-full flex-col p-5">
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
			</Box>
			<Box sx={{ p: 3 }}>
				<Box className="flex min-h-[400px] w-full items-center justify-center rounded-lg">
					<Skeleton variant="rectangular" width="100%" height={400} />
				</Box>
			</Box>
		</Paper>
	);
}

interface SingleGamePageProps {
	params: {
		gameId: string;
	};
}

export default async function SingleGamePage({ params }: SingleGamePageProps) {
	const gameId = params.gameId;

	// Prefetch the game data
	void api.game.getSingle.prefetch({ id: gameId });

	return (
		<main className="flex h-full flex-col">
			<HydrateClient>
				<Suspense fallback={<LoadingSkeleton />}>
					<SingleGameInterface gameId={gameId} />
				</Suspense>
			</HydrateClient>
		</main>
	);
}