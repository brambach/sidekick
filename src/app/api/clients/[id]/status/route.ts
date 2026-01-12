import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    // Validate status
    if (!status || !["active", "inactive", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: active, inactive, or archived" },
        { status: 400 }
      );
    }

    // Update client status
    const [updatedClient] = await db
      .update(clients)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .returning();

    if (!updatedClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(updatedClient, { status: 200 });
  } catch (error) {
    console.error("Error updating client status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
