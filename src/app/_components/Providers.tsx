"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TRPCReactProvider } from "~/trpc/react";
import { theme } from "./theme";

const Providers = React.memo(({ children }: { children: React.ReactNode }) => {
	return (
		<TRPCReactProvider>
			<AppRouterCacheProvider options={{ enableCssLayer: true }}>
				<ThemeProvider theme={theme}>
					<ErrorBoundary fallback={<p>Error from error boundary</p>}>
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
