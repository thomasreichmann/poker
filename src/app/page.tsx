import { Button, Paper } from "@mui/material";
import { api } from "~/trpc/server";

export default async function Home() {
	const hello = await api.table.hello();
	const tables = await api.table.query();

	return (
		<main className="flex h-screen flex-col items-center justify-center gap-4">
			<h1>{hello}</h1>
			<h1>asd</h1>
			<Button>Click me</Button>
			{tables.map((table) => (
				<Paper elevation={1} key={table.id} className="p-4">
					<pre>{JSON.stringify(table, null, 2)}</pre>
				</Paper>
			))}
		</main>
	);
}
