import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Divider,
	Paper,
	Typography,
} from "@mui/material";
import PublicTables from "~/app/_components/PublicTables";
import Realtime from "~/app/_components/Realtime";
import { createClient } from "~/supabase/server";

const supabase = createClient();

export default async function Home() {
	const { data, error } = await supabase.auth.getUser();
	const user = data ? data.user : null;

	return (
		<main className="flex flex-col items-center justify-center gap-4 pt-4">
			<section>
				{error ? (
					<h1>There was an error fetching user data.</h1>
				) : user ? (
					<h1>
						Welcome {user.email}! You are logged in. Your user id begins with{" "}
						{user.id.slice(0, 5)}
					</h1>
				) : (
					<h1>User not found.</h1>
				)}
			</section>

			<Divider flexItem />

			<Paper elevation={1} className="p-4">
				<Typography>Public Tables</Typography>
				<PublicTables />
			</Paper>

			<Divider flexItem />

			<section>
				<Accordion>
					<AccordionSummary expandIcon={<h1>▶</h1>}>
						<Typography>Real-time</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Realtime />
					</AccordionDetails>
				</Accordion>
			</section>
		</main>
	);
}
