import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files, users, projects, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyFileUploaded } from "@/lib/slack";
import { sendNewFileEmail } from "@/lib/email";

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

    // Get project and client info for notifications
    const project = await db
      .select({
        name: projects.name,
        clientId: projects.clientId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
      .then((rows) => rows[0]);

    if (project) {
      const client = await db
        .select({
          companyName: clients.companyName,
          contactName: clients.contactName,
          contactEmail: clients.contactEmail,
        })
        .from(clients)
        .where(eq(clients.id, project.clientId))
        .limit(1)
        .then((rows) => rows[0]);

      // Get uploader name from Clerk
      let uploaderName = user.role === "admin" ? "Digital Directions" : "Client";
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);
        uploaderName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || uploaderName;
      } catch {
        // Keep default name
      }

      // Slack notification (for client uploads only)
      if (user.role === "client") {
        notifyFileUploaded({
          fileName: name,
          uploaderName,
          clientName: client?.companyName || "Unknown Client",
          projectId,
          projectName: project.name,
        }).catch((err) => console.error("Slack notification failed:", err));
      }

      // Email notification (for admin uploads to notify client)
      if (user.role === "admin" && client?.contactEmail) {
        sendNewFileEmail({
          to: client.contactEmail,
          recipientName: client.contactName,
          projectName: project.name,
          projectId,
          fileName: name,
          uploaderName,
        }).catch((err) => console.error("Email notification failed:", err));
      }
    }

    return NextResponse.json(newFile[0], { status: 201 });
  } catch (error) {
    console.error("Error creating file record:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
