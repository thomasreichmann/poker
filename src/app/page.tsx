import { Button, Paper } from "@mui/material";
import { Suspense } from "react";
import { createClient } from "~/supabase/server";
import { api } from "~/trpc/server";
import { RealtimeTest } from "./_components/realtime";

const supabase = createClient();

export default async function Home() {
	const { data, error } = await supabase.auth.getUser();
	const hello = await api.table.hello();
	const tables = await api.table.query();

	return (
		<main className="flex h-screen flex-col items-center justify-center gap-4">
			<h1>{hello}</h1>
			<h1>asd</h1>
			{error && <p>Error: {error.message}</p>}
			{data?.user && <h1>Welcome {data.user.email}! You are logged in.</h1>}
			<Button>Click me</Button>
			{tables.map((table) => (
				<Paper elevation={1} key={table.id} className="p-4">
					<pre>{JSON.stringify(table, null, 2)}</pre>
				</Paper>
			))}
			<Suspense fallback={<p>Loading...</p>}>
				<RealtimeTest />
			</Suspense>
		</main>
	);
}
