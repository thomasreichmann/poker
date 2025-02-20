import { AppBar, Box, Button, Toolbar } from "@mui/material";
import Link from "next/link";
import SignOutButton from "~/app/_components/SignOutButton";
import Providers from "../_components/Providers";

const navItems = [
	{ label: "Home", href: "/" },
	{ label: "Game", href: "/game" },
];

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
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
