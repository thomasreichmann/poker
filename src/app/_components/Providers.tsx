"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TRPCReactProvider } from "~/trpc/react";
import { theme } from "./theme";

const Providers = React.memo(({ children }: { children: React.ReactNode }) => {
	return (
		<TRPCReactProvider>
			<AppRouterCacheProvider>
				<ThemeProvider theme={theme}>
					<ErrorBoundary fallback={<p>Error</p>}>
						<CssBaseline />
						{children}
					</ErrorBoundary>
				</ThemeProvider>
			</AppRouterCacheProvider>
		</TRPCReactProvider>
	);
});

Providers.displayName = "Providers";

export default Providers;
