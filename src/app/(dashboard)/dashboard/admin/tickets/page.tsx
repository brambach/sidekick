import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, clients, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { TicketList } from "@/components/ticket-card";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { Ticket, LayoutGrid } from "lucide-react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

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
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <Ticket className="w-7 h-7 text-indigo-600" />
              Tickets Overview
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              Manage support tickets and customer requests across all clients.
            </p>
          </div>
          <CreateTicketDialog clients={allClients} projects={allProjects} isAdmin />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-amber-50 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.05)] animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest mb-2">Open</p>
            <p className="text-[32px] font-medium text-slate-900 tracking-tight">{openTickets.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-indigo-50 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.05)] animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
            <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-widest mb-2">In Progress</p>
            <p className="text-[32px] font-medium text-slate-900 tracking-tight">{inProgressTickets.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-emerald-50 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.05)] animate-on-scroll [animation:animationIn_0.5s_ease-out_0.4s_both]">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest mb-2">Resolved</p>
            <p className="text-[32px] font-medium text-slate-900 tracking-tight">{resolvedTickets.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] animate-on-scroll [animation:animationIn_0.5s_ease-out_0.5s_both]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Total</p>
            <p className="text-[32px] font-medium text-slate-900 tracking-tight">{enrichedTickets.length}</p>
          </div>
        </div>

        {/* Open Tickets Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 opacity-80 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.6s_both]">
            <LayoutGrid className="w-4 h-4 text-amber-500" />
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
              Open Tickets ({openTickets.length})
            </h2>
            <div className="h-px bg-slate-200 flex-1 ml-2"></div>
          </div>
          <TicketList
            tickets={openTickets}
            basePath="/dashboard/admin/tickets"
            emptyMessage="No open tickets"
          />
        </div>

        {/* In Progress Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 opacity-80 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.7s_both]">
            <LayoutGrid className="w-4 h-4 text-indigo-500" />
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
              In Progress ({inProgressTickets.length})
            </h2>
            <div className="h-px bg-slate-200 flex-1 ml-2"></div>
          </div>
          <TicketList
            tickets={inProgressTickets}
            basePath="/dashboard/admin/tickets"
            emptyMessage="No tickets in progress"
          />
        </div>

        {/* Resolved Section */}
        {resolvedTickets.length > 0 && (
          <div className="pb-12">
            <div className="flex items-center gap-3 mb-6 opacity-80 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.8s_both]">
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                Recently Resolved ({resolvedTickets.length})
              </h2>
              <div className="h-px bg-slate-200 flex-1 ml-2"></div>
            </div>
            <TicketList
              tickets={resolvedTickets.slice(0, 5)}
              basePath="/dashboard/admin/tickets"
            />
          </div>
        )}
      </div>
    </>
  );
}
