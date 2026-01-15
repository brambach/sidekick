import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projectPhases,
  projects,
  phaseTemplates,
  templatePhases,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull, asc } from "drizzle-orm";

// POST /api/projects/[id]/phases/apply-template - Apply a phase template to a project
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
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
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

    // Verify template exists
    const template = await db
      .select()
      .from(phaseTemplates)
      .where(
        and(eq(phaseTemplates.id, templateId), isNull(phaseTemplates.deletedAt))
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!template) {
      return NextResponse.json(
        { error: "Phase template not found" },
        { status: 404 }
      );
    }

    // Get template phases
    const phases = await db
      .select()
      .from(templatePhases)
      .where(eq(templatePhases.templateId, templateId))
      .orderBy(asc(templatePhases.orderIndex));

    if (phases.length === 0) {
      return NextResponse.json(
        { error: "Template has no phases" },
        { status: 400 }
      );
    }

    // Delete existing phases for this project
    await db.delete(projectPhases).where(eq(projectPhases.projectId, id));

    // Create new phases from template
    const phasePromises = phases.map((phase) =>
      db.insert(projectPhases).values({
        projectId: id,
        name: phase.name,
        description: phase.description,
        orderIndex: phase.orderIndex,
        status: "pending",
      })
    );

    await Promise.all(phasePromises);

    // Update project to track which template was used
    await db
      .update(projects)
      .set({
        phaseTemplateId: templateId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    // Fetch created phases
    const createdPhases = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.projectId, id))
      .orderBy(asc(projectPhases.orderIndex));

    return NextResponse.json(createdPhases);
  } catch (error: any) {
    console.error("Error applying phase template:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
