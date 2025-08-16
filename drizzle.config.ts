import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

const projectDir = process.cwd();
loadEnvConfig(projectDir, process.env.NODE_ENV === "development");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
