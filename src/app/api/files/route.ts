import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from DB
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { projectId, name, fileUrl, fileSize, fileType } = body;

    // Validate required fields
    if (!projectId || !name || !fileUrl || !fileSize || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create file record
    const newFile = await db
      .insert(files)
      .values({
        projectId,
        name,
        fileUrl,
        fileSize,
        fileType,
        uploadedBy: user.id,
      })
      .returning();

    return NextResponse.json(newFile[0], { status: 201 });
  } catch (error) {
    console.error("Error creating file record:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
