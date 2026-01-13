import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, users } from "@/lib/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { TicketList } from "@/components/ticket-card";
import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import { Ticket, LayoutGrid } from "lucide-react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export const dynamic = "force-dynamic";

export default async function ClientTicketsPage() {
  const user = await requireAuth();

  if (!user.clientId) {
    return (
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        <div className="bg-white border-amber-200 rounded-2xl p-6 text-center border shadow-sm">
          <p className="text-amber-600">You don&apos;t have access to support tickets.</p>
        </div>
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
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <Ticket className="w-7 h-7 text-indigo-600" />
              Support
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              View your support tickets and create new ones if you need help.
            </p>
          </div>
          <CreateTicketDialog
            projects={clientProjects}
            defaultClientId={user.clientId}
          />
        </div>

        {/* Active Tickets */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6 opacity-80 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <LayoutGrid className="w-4 h-4 text-indigo-500" />
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
              Active Tickets ({activeTickets.length})
            </h2>
            <div className="h-px bg-slate-200 flex-1 ml-2"></div>
          </div>
          <TicketList
            tickets={activeTickets}
            basePath="/dashboard/client/tickets"
            showClient={false}
            emptyMessage="No active tickets. Create one if you need help!"
          />
        </div>

        {/* Resolved Tickets */}
        {resolvedTickets.length > 0 && (
          <div className="pb-12">
            <div className="flex items-center gap-3 mb-6 opacity-80 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                Resolved ({resolvedTickets.length})
              </h2>
              <div className="h-px bg-slate-200 flex-1 ml-2"></div>
            </div>
            <TicketList
              tickets={resolvedTickets}
              basePath="/dashboard/client/tickets"
              showClient={false}
            />
          </div>
        )}
      </div>
    </>
  );
}
