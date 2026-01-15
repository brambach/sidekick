import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET /api/clients/[id]/support-hours - Get client's support hours status
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

    // Get client
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

    // Calculate hours from minutes
    const allocatedHours = (client.supportHoursPerMonth || 0) / 60;
    const usedHours = (client.hoursUsedThisMonth || 0) / 60;
    const remainingHours = Math.max(0, allocatedHours - usedHours);
    const percentageUsed =
      allocatedHours > 0 ? Math.min(100, (usedHours / allocatedHours) * 100) : 0;

    return NextResponse.json({
      allocatedMinutes: client.supportHoursPerMonth || 0,
      usedMinutes: client.hoursUsedThisMonth || 0,
      allocatedHours: Math.round(allocatedHours * 10) / 10,
      usedHours: Math.round(usedHours * 10) / 10,
      remainingHours: Math.round(remainingHours * 10) / 10,
      percentageUsed: Math.round(percentageUsed),
      billingCycleStart: client.supportBillingCycleStart,
    });
  } catch (error) {
    console.error("Error fetching support hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch support hours" },
      { status: 500 }
    );
  }
}

// PATCH /api/clients/[id]/support-hours - Update support hours allocation (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { hoursPerMonth } = body;

    // Validate hours input
    if (
      typeof hoursPerMonth !== "number" ||
      hoursPerMonth < 0 ||
      hoursPerMonth > 10000 ||
      !Number.isFinite(hoursPerMonth)
    ) {
      return NextResponse.json(
        { error: "Hours must be a valid number between 0 and 10,000" },
        { status: 400 }
      );
    }

    // Check if client exists
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Convert hours to minutes
    const minutesPerMonth = hoursPerMonth * 60;

    // Set billing cycle start if not already set
    const updates: any = {
      supportHoursPerMonth: minutesPerMonth,
      updatedAt: new Date(),
    };

    if (!client.supportBillingCycleStart) {
      updates.supportBillingCycleStart = new Date();
      updates.hoursUsedThisMonth = 0; // Reset usage when setting up for first time
    }

    await db.update(clients).set(updates).where(eq(clients.id, id));

    return NextResponse.json({
      success: true,
      allocatedHours: hoursPerMonth,
    });
  } catch (error) {
    console.error("Error updating support hours:", error);
    return NextResponse.json(
      { error: "Failed to update support hours" },
      { status: 500 }
    );
  }
}
