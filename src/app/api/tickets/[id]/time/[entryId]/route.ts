import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ticketTimeEntries, tickets, clients } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// PUT /api/tickets/[id]/time/[entryId] - Update time entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, entryId } = await params;
    const body = await request.json();
    const { minutes, description } = body;

    // Validate minutes input
    if (
      typeof minutes !== "number" ||
      minutes <= 0 ||
      minutes > 1440 ||
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

    // Get existing entry
    const [existingEntry] = await db
      .select()
      .from(ticketTimeEntries)
      .where(
        and(
          eq(ticketTimeEntries.id, entryId),
          eq(ticketTimeEntries.ticketId, id),
          isNull(ticketTimeEntries.deletedAt)
        )
      )
      .limit(1);

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    const minutesDifference = minutes - existingEntry.minutes;

    // Update entry
    const [updatedEntry] = await db
      .update(ticketTimeEntries)
      .set({
        minutes,
        description: description || null,
      })
      .where(eq(ticketTimeEntries.id, entryId))
      .returning();

    // Update ticket's total time
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);

    if (ticket) {
      const newTotalMinutes = (ticket.timeSpentMinutes || 0) + minutesDifference;
      await db
        .update(tickets)
        .set({
          timeSpentMinutes: newTotalMinutes,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, id));

      // Update client's support hours if applicable
      if (existingEntry.countTowardsSupportHours && ticket.clientId) {
        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, ticket.clientId))
          .limit(1);

        if (client) {
          const newUsedMinutes =
            (client.hoursUsedThisMonth || 0) + minutesDifference;
          await db
            .update(clients)
            .set({
              hoursUsedThisMonth: newUsedMinutes,
              updatedAt: new Date(),
            })
            .where(eq(clients.id, ticket.clientId));
        }
      }
    }

    return NextResponse.json({
      success: true,
      entry: {
        ...updatedEntry,
        hours: Math.round((updatedEntry.minutes / 60) * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Error updating time entry:", error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id]/time/[entryId] - Delete time entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, entryId } = await params;

    // Get existing entry
    const [existingEntry] = await db
      .select()
      .from(ticketTimeEntries)
      .where(
        and(
          eq(ticketTimeEntries.id, entryId),
          eq(ticketTimeEntries.ticketId, id),
          isNull(ticketTimeEntries.deletedAt)
        )
      )
      .limit(1);

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    // Soft delete entry
    await db
      .update(ticketTimeEntries)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(ticketTimeEntries.id, entryId));

    // Update ticket's total time
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);

    if (ticket) {
      const newTotalMinutes =
        (ticket.timeSpentMinutes || 0) - existingEntry.minutes;
      await db
        .update(tickets)
        .set({
          timeSpentMinutes: Math.max(0, newTotalMinutes),
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, id));

      // Update client's support hours if applicable
      if (existingEntry.countTowardsSupportHours && ticket.clientId) {
        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, ticket.clientId))
          .limit(1);

        if (client) {
          const newUsedMinutes =
            (client.hoursUsedThisMonth || 0) - existingEntry.minutes;
          await db
            .update(clients)
            .set({
              hoursUsedThisMonth: Math.max(0, newUsedMinutes),
              updatedAt: new Date(),
            })
            .where(eq(clients.id, ticket.clientId));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return NextResponse.json(
      { error: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}
