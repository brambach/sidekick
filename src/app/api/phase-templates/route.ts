import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { phaseTemplates, templatePhases } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isNull, desc, eq } from "drizzle-orm";

// GET /api/phase-templates - List all phase templates
export async function GET() {
  try {
    const templates = await db
      .select()
      .from(phaseTemplates)
      .where(isNull(phaseTemplates.deletedAt))
      .orderBy(desc(phaseTemplates.isDefault), desc(phaseTemplates.createdAt));

    // Fetch phases for each template
    const templatesWithPhases = await Promise.all(
      templates.map(async (template) => {
        const phases = await db
          .select()
          .from(templatePhases)
          .where(eq(templatePhases.templateId, template.id))
          .orderBy(templatePhases.orderIndex);

        return {
          ...template,
          phases,
        };
      })
    );

    return NextResponse.json(templatesWithPhases);
  } catch (error) {
    console.error("Error fetching phase templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/phase-templates - Create new phase template (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, description, isDefault, phases } = body;

    if (!name || !phases || !Array.isArray(phases) || phases.length === 0) {
      return NextResponse.json(
        { error: "Name and phases are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .update(phaseTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(isNull(phaseTemplates.deletedAt));
    }

    // Create template
    const result = await db
      .insert(phaseTemplates)
      .values({
        name,
        description: description || null,
        isDefault: isDefault || false,
      })
      .returning();

    const newTemplate = (result as any)[0];

    // Create phases for template
    const phasePromises = phases.map(
      (phase: {
        name: string;
        description?: string;
        orderIndex: number;
        estimatedDays?: number;
        color?: string;
      }) =>
        db.insert(templatePhases).values({
          templateId: newTemplate.id,
          name: phase.name,
          description: phase.description || null,
          orderIndex: phase.orderIndex,
          estimatedDays: phase.estimatedDays || null,
          color: phase.color || null,
        })
    );

    await Promise.all(phasePromises);

    // Fetch the complete template with phases
    const createdPhases = await db
      .select()
      .from(templatePhases)
      .where(eq(templatePhases.templateId, newTemplate.id))
      .orderBy(templatePhases.orderIndex);

    return NextResponse.json(
      {
        ...newTemplate,
        phases: createdPhases,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating phase template:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
