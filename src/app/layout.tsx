import { type Metadata } from "next";
import "~/styles/globals.css";

import { TRPCReactProvider } from "~/trpc/react";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import React from "react";
import { theme } from "~/app/_components/theme";

import { Roboto } from "next/font/google";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "~/trpc/server";

const roboto = Roboto({
	weight: ["300", "400", "500", "700"],
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Poker",
	description: "Poker",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={roboto.className}>
			<body>
				<TRPCReactProvider>
					<HydrateClient>
						<AppRouterCacheProvider>
							<ThemeProvider theme={theme}>
								<ErrorBoundary fallback={<p>Error</p>}>
									<CssBaseline />
									{children}
								</ErrorBoundary>
							</ThemeProvider>
						</AppRouterCacheProvider>
					</HydrateClient>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
