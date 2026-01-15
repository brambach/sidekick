import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectPhases, projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull, asc } from "drizzle-orm";

// GET /api/projects/[id]/phases - Get all phases for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify user has access to this project
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check authorization
    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch phases
    const phases = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.projectId, id))
      .orderBy(asc(projectPhases.orderIndex));

    return NextResponse.json(phases);
  } catch (error: any) {
    console.error("Error fetching project phases:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/phases - Add a custom phase to a project (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, orderIndex, status } = body;

    if (!name || orderIndex === undefined) {
      return NextResponse.json(
        { error: "Name and orderIndex are required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create new phase
    const result = await db
      .insert(projectPhases)
      .values({
        projectId: id,
        name,
        description: description || null,
        orderIndex,
        status: status || "pending",
      })
      .returning();

    const newPhase = (result as any)[0];

    return NextResponse.json(newPhase, { status: 201 });
  } catch (error: any) {
    console.error("Error creating project phase:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
