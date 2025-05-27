import { Divider, Paper, Typography } from "@mui/material";
import PublicGames from "~/app/_components/PublicGames";
import { createClient } from "~/supabase/server";

export default async function Home() {
	const supabase = await createClient();
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
				<PublicGames />
			</Paper>

			<Divider flexItem />

			{/* <section>
				<Accordion>
					<AccordionSummary expandIcon={<h1>▶</h1>}>
						<Typography>Real-time</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Realtime />
					</AccordionDetails>
				</Accordion>
			</section> */}
		</main>
	);
}
