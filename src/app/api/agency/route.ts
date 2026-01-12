import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { agencies, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { name, primaryColor, logoUrl, domain } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      name,
      primaryColor: primaryColor || "#8B5CF6",
      updatedAt: new Date(),
    };

    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (domain !== undefined) updateData.domain = domain || null;

    // Update the agency (assuming single agency for MVP)
    const updatedAgency = await db
      .update(agencies)
      .set(updateData)
      .returning();

    return NextResponse.json(updatedAgency[0], { status: 200 });
  } catch (error) {
    console.error("Error updating agency:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
