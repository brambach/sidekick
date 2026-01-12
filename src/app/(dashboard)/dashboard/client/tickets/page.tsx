import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { TicketList } from "@/components/ticket-card";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientTicketsPage() {
  const user = await requireAuth();

  if (!user.clientId) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <p className="text-gray-500">You don&apos;t have access to support tickets.</p>
      </div>
    );
  }

  // Fetch client's tickets
  const ticketList = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      type: tickets.type,
      status: tickets.status,
      priority: tickets.priority,
      clientId: tickets.clientId,
      projectId: tickets.projectId,
      createdBy: tickets.createdBy,
      assignedTo: tickets.assignedTo,
      createdAt: tickets.createdAt,
      projectName: projects.name,
    })
    .from(tickets)
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(and(eq(tickets.clientId, user.clientId), isNull(tickets.deletedAt)))
    .orderBy(desc(tickets.createdAt));

  // Fetch client's projects for create dialog
  const clientProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.clientId, user.clientId), isNull(projects.deletedAt)));

  // Fetch Clerk user info
  const userIds = [
    ...new Set([
      ...ticketList.map((t) => t.createdBy),
      ...ticketList.map((t) => t.assignedTo),
    ].filter(Boolean)),
  ] as string[];

  const dbUsers = userIds.length > 0
    ? await db
        .select({ id: users.id, clerkId: users.clerkId })
        .from(users)
        .where(or(...userIds.map((id) => eq(users.id, id))))
    : [];

  const dbUserMap = new Map(dbUsers.map((u) => [u.id, u.clerkId]));

  const clerk = await clerkClient();
  const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
  const clerkUsers = clerkIds.length > 0
    ? await Promise.all(clerkIds.map(async (id) => {
        try {
          return await clerk.users.getUser(id);
        } catch {
          return null;
        }
      }))
    : [];

  const clerkUserMap = new Map(
    clerkUsers
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  // Enrich tickets
  const enrichedTickets = ticketList.map((ticket) => {
    const creatorClerkId = ticket.createdBy ? dbUserMap.get(ticket.createdBy) : null;
    const assigneeClerkId = ticket.assignedTo ? dbUserMap.get(ticket.assignedTo) : null;

    const creatorClerk = creatorClerkId ? clerkUserMap.get(creatorClerkId) : null;
    const assigneeClerk = assigneeClerkId ? clerkUserMap.get(assigneeClerkId) : null;

    return {
      ...ticket,
      clientName: null, // Client doesn't need to see their own name
      creatorName: creatorClerk
        ? `${creatorClerk.firstName || ""} ${creatorClerk.lastName || ""}`.trim() || "You"
        : "You",
      assigneeName: assigneeClerk
        ? `${assigneeClerk.firstName || ""} ${assigneeClerk.lastName || ""}`.trim()
        : null,
    };
  });

  // Group tickets
  const activeTickets = enrichedTickets.filter(
    (t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_on_client"
  );
  const resolvedTickets = enrichedTickets.filter((t) => t.status === "resolved" || t.status === "closed");

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8" />
            Support
          </h1>
          <p className="text-gray-500 mt-1">View and create support tickets</p>
        </div>
        <CreateTicketDialog
          projects={clientProjects}
          defaultClientId={user.clientId}
        />
      </div>

      {/* Active Tickets */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Tickets ({activeTickets.length})</h2>
        <TicketList
          tickets={activeTickets}
          basePath="/dashboard/client/tickets"
          showClient={false}
          emptyMessage="No active tickets. Create one if you need help!"
        />
      </div>

      {/* Resolved Tickets */}
      {resolvedTickets.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resolved ({resolvedTickets.length})</h2>
          <TicketList
            tickets={resolvedTickets}
            basePath="/dashboard/client/tickets"
            showClient={false}
          />
        </div>
      )}
    </div>
  );
}
