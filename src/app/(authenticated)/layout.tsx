import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import SignOutButton from "~/app/_components/SignOutButton";
import { createClient } from "~/supabase/server";
import Providers from "../_components/Providers";

const navItems = [
	{ label: "Home", href: "/" },
	{ label: "Game", href: "/game" },
];

const supabase = createClient();

async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return (
		<Providers>
			<Box className="flex h-screen flex-col">
				<AppBar position="static">
					<Toolbar>
						<Box className="flex grow gap-2">
							{navItems.map(({ label, href }) => (
								<Link key={href} href={href} prefetch={true}>
									<Button>{label}</Button>
								</Link>
							))}
						</Box>
						<Box className="flex grow-0">
							<Typography variant="h6" className="mr-2" color="textDisabled">
								{user?.email}
							</Typography>
							<SignOutButton />
						</Box>
					</Toolbar>
				</AppBar>
				{children}
			</Box>
		</Providers>
	);
}

export default AuthenticatedLayout;
