import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationMonitors } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isNull, desc, eq, and } from "drizzle-orm";

// GET /api/integrations - List all integration monitors
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();

    // Get clientId from query params (optional - admins can see all)
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    // Build where clause
    const whereClause = clientId
      ? and(
          eq(integrationMonitors.clientId, clientId),
          isNull(integrationMonitors.deletedAt)
        )
      : isNull(integrationMonitors.deletedAt);

    const monitors = await db
      .select()
      .from(integrationMonitors)
      .where(whereClause)
      .orderBy(desc(integrationMonitors.createdAt));

    return NextResponse.json(monitors);
  } catch (error: any) {
    console.error("Error fetching integration monitors:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/integrations - Create new integration monitor (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      clientId,
      serviceType,
      serviceName,
      apiEndpoint,
      credentials,
      workatoRecipeIds,
      isEnabled,
      checkIntervalMinutes,
    } = body;

    if (!clientId || !serviceType || !serviceName) {
      return NextResponse.json(
        { error: "clientId, serviceType, and serviceName are required" },
        { status: 400 }
      );
    }

    // Validate serviceType
    const validServiceTypes = ["hibob", "workato", "keypay", "adp"];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { error: "Invalid serviceType" },
        { status: 400 }
      );
    }

    // Create integration monitor
    const result = await db
      .insert(integrationMonitors)
      .values({
        clientId,
        serviceType,
        serviceName,
        apiEndpoint: apiEndpoint || null,
        credentials: credentials || null,
        workatoRecipeIds: workatoRecipeIds || null,
        isEnabled: isEnabled !== false, // Default to true
        checkIntervalMinutes: checkIntervalMinutes || 5,
        currentStatus: "unknown",
      })
      .returning();

    const newMonitor = (result as any)[0];

    return NextResponse.json(newMonitor, { status: 201 });
  } catch (error: any) {
    console.error("Error creating integration monitor:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
