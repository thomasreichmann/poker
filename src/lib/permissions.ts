import { db } from "@/db";
import { UserRoleEnum, userRoles } from "@/db/schema/userRoles";
import { eq } from "drizzle-orm";

export interface PermissionContext {
  userId: string;
  userRole?: UserRoleEnum;
}

/**
 * Ensure user role record exists, create with default if not
 */
export async function ensureUserRole(userId: string): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(userRoles).values({
        userId,
        role: "user",
      });
    }
  } catch (error) {
    console.error("Error ensuring user role:", error);
  }
}

/**
 * Get user role from database - server-side only
 */
export async function getUserRole(userId: string): Promise<UserRoleEnum> {
  try {
    // Ensure user role record exists
    await ensureUserRole(userId);

    const result = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);

    const role = result[0]?.role as UserRoleEnum;
    return role || "user";
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "user"; // Default to lowest permission on error
  }
}

/**
 * Check if user has permission for development features
 */
export function canAccessDevFeatures(role: UserRoleEnum): boolean {
  return role === "admin" || role === "dev";
}

/**
 * Check if user has permission for admin features
 */
export function canAccessAdminFeatures(role: UserRoleEnum): boolean {
  return role == "admin" || role == "dev";
}

/**
 * Get permission context for a user (includes role lookup)
 */
export async function getPermissionContext(
  userId: string
): Promise<PermissionContext> {
  const userRole = await getUserRole(userId);
  return {
    userId,
    userRole,
  };
}

/**
 * Server-side guard for dev features - throws if unauthorized
 */
export async function requireDevAccess(
  userId: string
): Promise<PermissionContext> {
  const context = await getPermissionContext(userId);

  if (!canAccessDevFeatures(context.userRole!)) {
    throw new Error(
      "Unauthorized: Development features require admin or dev role"
    );
  }

  return context;
}

/**
 * Server-side guard for admin features - throws if unauthorized
 */
export async function requireAdminAccess(
  userId: string
): Promise<PermissionContext> {
  const context = await getPermissionContext(userId);

  if (!canAccessAdminFeatures(context.userRole!)) {
    throw new Error("Unauthorized: Admin features require admin role");
  }

  return context;
}

/**
 * Set user role - server-side only
 */
export async function setUserRole(
  userId: string,
  role: UserRoleEnum
): Promise<void> {
  try {
    // Ensure user role record exists
    await ensureUserRole(userId);

    // Update the role
    await db
      .update(userRoles)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(userRoles.userId, userId));
  } catch (error) {
    console.error("Error setting user role:", error);
    throw new Error("Failed to set user role");
  }
}
