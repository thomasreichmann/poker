"use client";
import { createTheme } from "@mui/material";

const rootElement = typeof window === "undefined" ? null : document.getElementById("__next");

export const theme = createTheme({
	palette: {
		mode: "dark",
	},
	typography: {
		fontFamily: "var(--font-roboto)",
	},
	cssVariables: true,
});
