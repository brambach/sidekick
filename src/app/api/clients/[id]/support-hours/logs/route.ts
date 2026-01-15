import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportHourLogs, clients } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

// GET /api/clients/[id]/support-hours/logs - Get historical support hour logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if client exists
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check authorization
    if (user.role !== "admin" && user.clientId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get logs
    const logs = await db
      .select()
      .from(supportHourLogs)
      .where(eq(supportHourLogs.clientId, id))
      .orderBy(desc(supportHourLogs.periodStart));

    // Format logs with hours
    const formattedLogs = logs.map((log) => ({
      ...log,
      allocatedHours: Math.round((log.allocatedMinutes / 60) * 10) / 10,
      usedHours: Math.round((log.usedMinutes / 60) * 10) / 10,
      remainingHours:
        Math.round(((log.allocatedMinutes - log.usedMinutes) / 60) * 10) / 10,
      percentageUsed:
        log.allocatedMinutes > 0
          ? Math.round((log.usedMinutes / log.allocatedMinutes) * 100)
          : 0,
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error) {
    console.error("Error fetching support hour logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch support hour logs" },
      { status: 500 }
    );
  }
}
