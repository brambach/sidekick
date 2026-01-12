import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets, projects, users, ticketComments } from "@/lib/db/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, FolderKanban, Calendar, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeBadge } from "@/components/ticket-status-badge";
import { TicketCommentForm } from "@/components/ticket-comment-form";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ClientTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  if (!user.clientId) {
    notFound();
  }

  // Fetch ticket and verify ownership
  const ticket = await db
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
      resolvedAt: tickets.resolvedAt,
      resolution: tickets.resolution,
      createdAt: tickets.createdAt,
      projectName: projects.name,
    })
    .from(tickets)
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .where(
      and(
        eq(tickets.id, id),
        eq(tickets.clientId, user.clientId),
        isNull(tickets.deletedAt)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!ticket) {
    notFound();
  }

  // Fetch comments (excluding internal notes)
  const comments = await db
    .select({
      id: ticketComments.id,
      content: ticketComments.content,
      authorId: ticketComments.authorId,
      createdAt: ticketComments.createdAt,
    })
    .from(ticketComments)
    .where(
      and(
        eq(ticketComments.ticketId, id),
        eq(ticketComments.isInternal, false),
        isNull(ticketComments.deletedAt)
      )
    )
    .orderBy(desc(ticketComments.createdAt));

  // Get all user IDs
  const userIds = [
    ticket.createdBy,
    ticket.assignedTo,
    ...comments.map((c) => c.authorId),
  ].filter(Boolean) as string[];

  const uniqueUserIds = [...new Set(userIds)];

  // Fetch DB users
  const dbUsers = uniqueUserIds.length > 0
    ? await db
        .select({ id: users.id, clerkId: users.clerkId, role: users.role })
        .from(users)
        .where(or(...uniqueUserIds.map((uid) => eq(users.id, uid))))
    : [];

  const dbUserMap = new Map(dbUsers.map((u) => [u.id, { clerkId: u.clerkId, role: u.role }]));

  // Fetch Clerk users
  const clerk = await clerkClient();
  const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
  const clerkUsers = clerkIds.length > 0
    ? await Promise.all(clerkIds.map(async (cid) => {
        try {
          return await clerk.users.getUser(cid);
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

  const getUserInfo = (userId: string | null) => {
    if (!userId) return null;
    const dbUser = dbUserMap.get(userId);
    if (!dbUser) return { name: "User", avatar: null, role: null };
    const clerkUser = dbUser.clerkId ? clerkUserMap.get(dbUser.clerkId) : null;
    return {
      name: clerkUser
        ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User"
        : "User",
      avatar: clerkUser?.imageUrl || null,
      role: dbUser.role,
    };
  };

  const assignee = getUserInfo(ticket.assignedTo);
  const isResolved = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Back Button */}
      <Link
        href="/dashboard/client/tickets"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Support
      </Link>

      {/* Ticket Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-gray-900">{ticket.title}</h1>
          <TicketStatusBadge status={ticket.status} size="md" />
          <TicketPriorityBadge priority={ticket.priority} size="md" />
          <TicketTypeBadge type={ticket.type} size="md" />
        </div>

        <p className="text-gray-600 whitespace-pre-wrap mb-4">{ticket.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          {ticket.projectName && (
            <Link
              href={`/dashboard/client/projects/${ticket.projectId}`}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
            >
              <FolderKanban className="w-4 h-4" />
              <span>{ticket.projectName}</span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Submitted {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comments */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Conversation</h2>

          {!isResolved && <TicketCommentForm ticketId={id} />}

          {comments.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">No replies yet. Our team will respond shortly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const author = getUserInfo(comment.authorId);
                return (
                  <div key={comment.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      {author?.avatar ? (
                        <Image
                          src={author.avatar}
                          alt={author.name}
                          width={32}
                          height={32}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{author?.name}</span>
                          {author?.role === "admin" && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                              Digital Directions
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Details</h2>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Assigned to</p>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    {assignee.avatar ? (
                      <Image src={assignee.avatar} alt={assignee.name} width={24} height={24} className="rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-600" />
                      </div>
                    )}
                    <span className="text-sm text-gray-900">{assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Awaiting assignment</span>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                <TicketStatusBadge status={ticket.status} />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Priority</p>
                <TicketPriorityBadge priority={ticket.priority} />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Submitted</p>
                <p className="text-sm text-gray-900">{format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>

              {ticket.resolvedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Resolved</p>
                  <p className="text-sm text-gray-900">{format(new Date(ticket.resolvedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              )}
            </div>
          </div>

          {ticket.resolution && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 mb-2">Resolution</p>
              <p className="text-sm text-green-700 whitespace-pre-wrap">{ticket.resolution}</p>
            </div>
          )}

          {ticket.status === "waiting_on_client" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-800 mb-1">Action Required</p>
              <p className="text-sm text-orange-700">
                We&apos;re waiting for your response. Please add a comment above to continue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
