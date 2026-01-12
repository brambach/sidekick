import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { TicketList } from "@/components/ticket-card";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  await requireAdmin();

  // Fetch all tickets with related data
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
      clientName: clients.companyName,
      projectName: projects.name,
    })
    .from(tickets)
    .leftJoin(clients, eq(tickets.clientId, clients.id))
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(isNull(tickets.deletedAt))
    .orderBy(desc(tickets.createdAt));

  // Fetch clients and projects for create dialog
  const [allClients, allProjects] = await Promise.all([
    db
      .select({ id: clients.id, companyName: clients.companyName })
      .from(clients)
      .where(and(isNull(clients.deletedAt), eq(clients.status, "active"))),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(isNull(projects.deletedAt)),
  ]);

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
      creatorName: creatorClerk
        ? `${creatorClerk.firstName || ""} ${creatorClerk.lastName || ""}`.trim() || "User"
        : "User",
      assigneeName: assigneeClerk
        ? `${assigneeClerk.firstName || ""} ${assigneeClerk.lastName || ""}`.trim()
        : null,
    };
  });

  // Group tickets by status for dashboard view
  const openTickets = enrichedTickets.filter((t) => t.status === "open");
  const inProgressTickets = enrichedTickets.filter((t) => t.status === "in_progress" || t.status === "waiting_on_client");
  const resolvedTickets = enrichedTickets.filter((t) => t.status === "resolved" || t.status === "closed");

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8" />
            Tickets
          </h1>
          <p className="text-gray-500 mt-1">Manage support tickets from your clients</p>
        </div>
        <CreateTicketDialog clients={allClients} projects={allProjects} isAdmin />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-500">Open</p>
          <p className="text-2xl font-semibold text-yellow-600">{openTickets.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="text-2xl font-semibold text-blue-600">{inProgressTickets.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-500">Resolved</p>
          <p className="text-2xl font-semibold text-green-600">{resolvedTickets.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-500">Total</p>
          <p className="text-2xl font-semibold text-gray-900">{enrichedTickets.length}</p>
        </div>
      </div>

      {/* Open Tickets */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Open Tickets ({openTickets.length})</h2>
        <TicketList
          tickets={openTickets}
          basePath="/dashboard/admin/tickets"
          emptyMessage="No open tickets"
        />
      </div>

      {/* In Progress */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">In Progress ({inProgressTickets.length})</h2>
        <TicketList
          tickets={inProgressTickets}
          basePath="/dashboard/admin/tickets"
          emptyMessage="No tickets in progress"
        />
      </div>

      {/* Resolved */}
      {resolvedTickets.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Resolved ({resolvedTickets.length})</h2>
          <TicketList
            tickets={resolvedTickets.slice(0, 5)}
            basePath="/dashboard/admin/tickets"
          />
        </div>
      )}
    </div>
  );
}
