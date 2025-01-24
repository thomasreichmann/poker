import { Suspense } from "react";
import { RealtimeTest } from "./realtime";

export default function Realtime() {
	return (
		<Suspense fallback={<p>Loading...</p>}>
			<RealtimeTest />
		</Suspense>
	);
}
