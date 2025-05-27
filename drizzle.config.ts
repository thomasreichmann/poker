import { type Config } from "drizzle-kit";

import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir, process.env.NODE_ENV === "development");

export default {
	schema: "./src/server/db/schema",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
} satisfies Config;
