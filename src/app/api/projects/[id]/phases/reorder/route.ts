import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectPhases, projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

// PUT /api/projects/[id]/phases/reorder - Reorder phases (admin only)
export async function PUT(
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
    const { phaseIds } = body;

    if (!phaseIds || !Array.isArray(phaseIds)) {
      return NextResponse.json(
        { error: "phaseIds array is required" },
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

    // Update orderIndex for each phase
    const updatePromises = phaseIds.map((phaseId, index) =>
      db
        .update(projectPhases)
        .set({ orderIndex: index })
        .where(
          and(eq(projectPhases.id, phaseId), eq(projectPhases.projectId, id))
        )
    );

    await Promise.all(updatePromises);

    // Fetch reordered phases
    const phases = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.projectId, id))
      .orderBy(projectPhases.orderIndex);

    return NextResponse.json(phases);
  } catch (error: any) {
    console.error("Error reordering phases:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
