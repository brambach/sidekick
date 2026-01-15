import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationMonitors, integrationMetrics } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull, desc } from "drizzle-orm";

// GET /api/integrations/[id]/status - Get current status and recent metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Fetch monitor
    const monitor = await db
      .select()
      .from(integrationMonitors)
      .where(
        and(eq(integrationMonitors.id, id), isNull(integrationMonitors.deletedAt))
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!monitor) {
      return NextResponse.json(
        { error: "Integration monitor not found" },
        { status: 404 }
      );
    }

    // Check authorization - clients can only see their own integrations
    if (user.role === "client" && monitor.clientId !== user.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch recent metrics (last 10)
    const recentMetrics = await db
      .select()
      .from(integrationMetrics)
      .where(eq(integrationMetrics.monitorId, id))
      .orderBy(desc(integrationMetrics.checkedAt))
      .limit(10);

    return NextResponse.json({
      monitor,
      recentMetrics,
    });
  } catch (error: any) {
    console.error("Error fetching integration status:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
