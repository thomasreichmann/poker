import { AppBar, Button, Toolbar } from "@mui/material";
import { type Metadata } from "next";
import { Roboto } from "next/font/google";
import Link from "next/link";
import "~/styles/globals.css";
import Providers from "./_components/Providers";

const roboto = Roboto({
	weight: ["300", "400", "500", "700"],
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Poker",
	description: "Poker",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const navItems = [
	{ label: "Home", href: "/" },
	{ label: "Game", href: "/game" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={roboto.className}>
			<body>
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
			</body>
		</html>
	);
}
