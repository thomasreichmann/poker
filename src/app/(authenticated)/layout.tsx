import { AppBar, Button, Toolbar } from "@mui/material";
import Link from "next/link";
import Providers from "../_components/Providers";

const navItems = [
	{ label: "Home", href: "/" },
	{ label: "Game", href: "/game" },
];

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
	return (
		<Providers>
			<AppBar position="static">
				<Toolbar>
					{navItems.map(({ label, href }) => (
						<Link key={href} href={href} prefetch={true}>
							<Button>{label}</Button>
						</Link>
					))}
				</Toolbar>
			</AppBar>
			{children}
		</Providers>
	);
}

export default AuthenticatedLayout;
