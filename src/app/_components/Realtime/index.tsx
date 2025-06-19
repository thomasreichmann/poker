import { Suspense } from "react";
import { RealtimeTest } from "./realtime";

export default function Realtime() {
	return (
		<Suspense fallback={<p>Loading...</p>}>
			<RealtimeTest />
		</Suspense>
	);
}

export { RealtimeTest } from "./realtime";
export { useGameRealtime } from "./useGameRealtime";
export { usePlayerRealtime } from "./usePlayerRealtime";
export { usePokerRealtime } from "./usePokerRealtime";
export { RealtimeStatus } from "./RealtimeStatus";
export { RealtimeTest as RealtimeTestNew } from "./test-realtime";
