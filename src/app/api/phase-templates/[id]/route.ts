import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { phaseTemplates, templatePhases } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

// GET /api/phase-templates/[id] - Get single phase template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await db
      .select()
      .from(phaseTemplates)
      .where(and(eq(phaseTemplates.id, id), isNull(phaseTemplates.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!template) {
      return NextResponse.json(
        { error: "Phase template not found" },
        { status: 404 }
      );
    }

    // Fetch phases for template
    const phases = await db
      .select()
      .from(templatePhases)
      .where(eq(templatePhases.templateId, id))
      .orderBy(templatePhases.orderIndex);

    return NextResponse.json({
      ...template,
      phases,
    });
  } catch (error) {
    console.error("Error fetching phase template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/phase-templates/[id] - Update phase template (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { name, description, isDefault, phases } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if template exists
    const existing = await db
      .select()
      .from(phaseTemplates)
      .where(and(eq(phaseTemplates.id, id), isNull(phaseTemplates.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!existing) {
      return NextResponse.json(
        { error: "Phase template not found" },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await db
        .update(phaseTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(isNull(phaseTemplates.deletedAt), eq(phaseTemplates.isDefault, true))
        );
    }

    // Update template
    await db
      .update(phaseTemplates)
      .set({
        name,
        description: description || null,
        isDefault: isDefault || false,
        updatedAt: new Date(),
      })
      .where(eq(phaseTemplates.id, id));

    // If phases provided, update them
    if (phases && Array.isArray(phases)) {
      // Delete existing phases (cascade handles this)
      await db
        .delete(templatePhases)
        .where(eq(templatePhases.templateId, id));

      // Create new phases
      const phasePromises = phases.map(
        (phase: {
          name: string;
          description?: string;
          orderIndex: number;
          estimatedDays?: number;
          color?: string;
        }) =>
          db.insert(templatePhases).values({
            templateId: id,
            name: phase.name,
            description: phase.description || null,
            orderIndex: phase.orderIndex,
            estimatedDays: phase.estimatedDays || null,
            color: phase.color || null,
          })
      );

      await Promise.all(phasePromises);
    }

    // Fetch updated template with phases
    const updatedTemplate = await db
      .select()
      .from(phaseTemplates)
      .where(eq(phaseTemplates.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    const updatedPhases = await db
      .select()
      .from(templatePhases)
      .where(eq(templatePhases.templateId, id))
      .orderBy(templatePhases.orderIndex);

    return NextResponse.json({
      ...updatedTemplate,
      phases: updatedPhases,
    });
  } catch (error: any) {
    console.error("Error updating phase template:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/phase-templates/[id] - Soft delete phase template (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if template exists
    const existing = await db
      .select()
      .from(phaseTemplates)
      .where(and(eq(phaseTemplates.id, id), isNull(phaseTemplates.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!existing) {
      return NextResponse.json(
        { error: "Phase template not found" },
        { status: 404 }
      );
    }

    // Soft delete template (phases are cascade deleted via FK)
    await db
      .update(phaseTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(phaseTemplates.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting phase template:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
