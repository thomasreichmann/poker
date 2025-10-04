import { requireAdminAccess, setUserRole } from "@/lib/permissions";
import { getSupabaseServerClient } from "@/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  targetUserId: z.uuid(),
  role: z.enum(["user", "admin", "dev"]),
});

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if current user has admin access
    await requireAdminAccess(user.id);

    // Parse request body
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetUserId, role } = parsed.data;

    // Update user role using permission system
    await setUserRole(targetUserId, role);

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    console.error("Error setting user role:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
