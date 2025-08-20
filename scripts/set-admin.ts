/**
 * Script to set a user as admin/dev
 * Usage: npx tsx scripts/set-admin.ts <user-email> <role> [--prod]
 * Example: npx tsx scripts/set-admin.ts thomas@example.com admin
 * Prod: NODE_ENV=production npx tsx scripts/set-admin.ts thomas@example.com admin
 */

// Environment is loaded via tsx --env-file flag

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema/users";
import { setUserRole } from "../src/lib/permissions";

async function setUserRoleByEmail(
  email: string,
  role: "user" | "admin" | "dev"
) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    console.log(
      `🌍 Environment: ${isProduction ? "PRODUCTION" : "Development"}`
    );
    console.log(`Setting role for ${email} to ${role}...`);

    // Find user by email
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userRows.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    const user = userRows[0]!;
    console.log(`Found user: ${user.id} (${user.email})`);

    // Update role using permission system
    await setUserRole(user.id, role);

    console.log(`✅ Successfully set ${email} role to ${role}`);
    console.log(`User ID: ${user.id}`);
  } catch (error) {
    console.error("❌ Error setting user role:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2 || args.length > 3) {
  console.error("Usage: npx tsx scripts/set-admin.ts <user-email> <role>");
  console.error("Examples:");
  console.error(
    "  Dev:  npx tsx scripts/set-admin.ts thomas@example.com admin"
  );
  console.error(
    "  Prod: NODE_ENV=production npx tsx scripts/set-admin.ts thomas@example.com admin"
  );
  console.error("Roles: user, admin, dev");
  process.exit(1);
}

const [email, role] = args;
if (!["user", "admin", "dev"].includes(role!)) {
  console.error("❌ Invalid role. Must be: user, admin, or dev");
  process.exit(1);
}

// Run the script
setUserRoleByEmail(email!, role as "user" | "admin" | "dev")
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
