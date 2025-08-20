import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

const projectDir = process.cwd();
const isDevelopment = process.env.NODE_ENV !== "production";

// Load environment config based on NODE_ENV
loadEnvConfig(projectDir, isDevelopment);

// Determine which DATABASE_URL to use
let databaseUrl = process.env.DATABASE_URL;

// If in production mode, check for PROD_DATABASE_URL first
if (!isDevelopment && process.env.PROD_DATABASE_URL) {
  databaseUrl = process.env.PROD_DATABASE_URL;
}

if (!databaseUrl) {
  const envType = isDevelopment ? "development" : "production";
  const varName = isDevelopment
    ? "DATABASE_URL"
    : "DATABASE_URL or PROD_DATABASE_URL";
  throw new Error(`${varName} is not set for ${envType} environment`);
}

console.log(`🗄️  Using ${isDevelopment ? "local" : "production"} database`);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
