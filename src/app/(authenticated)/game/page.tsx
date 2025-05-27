import TableInterface from "~/app/_components/TableInterface";

export const dynamic = "force-dynamic";

export default function GamePage() {
	return (
		<main className="flex h-full flex-col">
			<TableInterface />
		</main>
	);
}
