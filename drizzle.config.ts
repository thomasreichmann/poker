import { type Config } from "drizzle-kit";

import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

export default {
	schema: "./src/server/db/schema",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
} satisfies Config;
