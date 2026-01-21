import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients, users, agencies } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { notifyNewClient } from "@/lib/notifications";

export async function POST(req: NextRequest) {
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

    // Get agency ID (from user or get the first/only agency - Digital Directions)
    let agencyId = user.agencyId;

    if (!agencyId) {
      const [agency] = await db
        .select()
        .from(agencies)
        .where(isNull(agencies.deletedAt))
        .limit(1);

      if (!agency) {
        return NextResponse.json({ error: "No agency found. Please run database seed." }, { status: 400 });
      }

      agencyId = agency.id;

      // Update user with agency ID for future requests
      await db
        .update(users)
        .set({ agencyId: agency.id })
        .where(eq(users.clerkId, userId));
    }

    const body = await req.json();
    const { companyName, contactName, contactEmail, status = "active" } = body;

    // Validate required fields
    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Missing required fields: companyName, contactName, contactEmail" },
        { status: 400 }
      );
    }

    // Create new client
    const [newClient] = await db
      .insert(clients)
      .values({
        agencyId,
        companyName,
        contactName,
        contactEmail,
        status,
      })
      .returning();

    // Get creator name from Clerk for notification
    let addedByName = "Admin";
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      addedByName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Admin";
    } catch {
      // Keep default name
    }

    // Create in-app notification for all admins
    notifyNewClient({
      clientId: newClient.id,
      clientName: companyName,
      addedByName,
    }).catch((err) => console.error("In-app notification failed:", err));

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
