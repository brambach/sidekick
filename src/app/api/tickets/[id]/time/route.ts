import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ticketTimeEntries, tickets, clients, users } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

// GET /api/tickets/[id]/time - Get all time entries for a ticket
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

    // Get ticket to check authorization
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check authorization
    if (user.role !== "admin" && user.clientId !== ticket.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get time entries with user info
    const entries = await db
      .select({
        id: ticketTimeEntries.id,
        ticketId: ticketTimeEntries.ticketId,
        userId: ticketTimeEntries.userId,
        minutes: ticketTimeEntries.minutes,
        description: ticketTimeEntries.description,
        loggedAt: ticketTimeEntries.loggedAt,
        countTowardsSupportHours: ticketTimeEntries.countTowardsSupportHours,
        createdAt: ticketTimeEntries.createdAt,
        userClerkId: users.clerkId,
        userRole: users.role,
      })
      .from(ticketTimeEntries)
      .leftJoin(users, eq(ticketTimeEntries.userId, users.id))
      .where(and(eq(ticketTimeEntries.ticketId, id), isNull(ticketTimeEntries.deletedAt)))
      .orderBy(desc(ticketTimeEntries.loggedAt));

    // Calculate hours
    const entriesWithHours = entries.map((entry) => ({
      ...entry,
      hours: Math.round((entry.minutes / 60) * 10) / 10,
    }));

    const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    return NextResponse.json({
      entries: entriesWithHours,
      totalMinutes,
      totalHours,
    });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id]/time - Log new time entry
export async function POST(
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
    const { minutes, description, countTowardsSupportHours = true } = body;

    // Validate minutes input
    if (
      typeof minutes !== "number" ||
      minutes <= 0 ||
      minutes > 1440 || // Max 24 hours per entry
      !Number.isFinite(minutes) ||
      !Number.isInteger(minutes)
    ) {
      return NextResponse.json(
        { error: "Minutes must be a positive integer between 1 and 1440" },
        { status: 400 }
      );
    }

    // Validate description length if provided
    if (description && typeof description === "string" && description.length > 1000) {
      return NextResponse.json(
        { error: "Description must be less than 1000 characters" },
        { status: 400 }
      );
    }

    // Get ticket
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Create time entry
    const [entry] = await db
      .insert(ticketTimeEntries)
      .values({
        ticketId: id,
        userId: user.id,
        minutes,
        description: description || null,
        countTowardsSupportHours,
        loggedAt: new Date(),
      })
      .returning();

    // Update ticket's total time spent
    const newTotalMinutes = (ticket.timeSpentMinutes || 0) + minutes;
    await db
      .update(tickets)
      .set({
        timeSpentMinutes: newTotalMinutes,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id));

    // If this counts towards support hours, deduct from client's balance
    if (countTowardsSupportHours && ticket.clientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, ticket.clientId))
        .limit(1);

      if (client) {
        const newUsedMinutes = (client.hoursUsedThisMonth || 0) + minutes;
        await db
          .update(clients)
          .set({
            hoursUsedThisMonth: newUsedMinutes,
            updatedAt: new Date(),
          })
          .where(eq(clients.id, ticket.clientId));
      }
    }

    return NextResponse.json({
      success: true,
      entry: {
        ...entry,
        hours: Math.round((entry.minutes / 60) * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Error logging time:", error);
    return NextResponse.json(
      { error: "Failed to log time" },
      { status: 500 }
    );
  }
}
