import { type Metadata } from "next";
import { Roboto } from "next/font/google";
import "~/styles/globals.css";
import DevDashboard from "./_components/DevDashboard";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={roboto.className}>
			<body>
				<Providers>
					<DevDashboard />
					{children}
				</Providers>
			</body>
		</html>
	);
}
