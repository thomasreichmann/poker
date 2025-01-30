import { Suspense } from "react";
import TableInterface from "../_components/TableInterface";

export default function GamePage() {
	return (
		<main className="flex flex-col">
			<Suspense fallback={<LoadingSkeleton />}>
				<TableInterface />
			</Suspense>
		</main>
	);
}

export function LoadingSkeleton() {
	return (
		<main className="flex flex-col">
			<div className="animate-pulse">
				<div className="h-8 w-full rounded bg-gray-200"></div>
				<div className="mt-4 space-y-3">
					<div className="h-4 w-3/4 rounded bg-gray-200"></div>
					<div className="h-4 w-1/2 rounded bg-gray-200"></div>
					<div className="h-4 w-5/6 rounded bg-gray-200"></div>
				</div>
			</div>
		</main>
	);
}
