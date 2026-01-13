import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, projects } from "@/lib/db/schema";
import { isNull, eq, and, sql, desc } from "drizzle-orm";
import { Users, Activity, Archive, LayoutGrid, ArrowRight, FolderOpen, CheckCircle, TrendingUp, Zap, Clock4 } from "lucide-react";
import { InviteTeamMemberDialog } from "@/components/invite-team-member-dialog";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  // Fetch all clients with their project counts
  const allClients = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
      contactName: clients.contactName,
      contactEmail: clients.contactEmail,
      status: clients.status,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(desc(clients.createdAt));

  // Get project counts for each client
  const clientsWithProjects = await Promise.all(
    allClients.map(async (client) => {
      const projectCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(
          and(
            eq(projects.clientId, client.id),
            isNull(projects.deletedAt),
            sql`${projects.status} IN ('in_progress', 'planning', 'review')`
          )
        )
        .then((rows) => rows[0]?.count || 0);

      return {
        ...client,
        activeProjects: projectCount,
      };
    })
  );

  // Calculate stats
  const totalClients = allClients.length;
  const activeClients = allClients.filter((c) => c.status === "active").length;
  const archivedClients = allClients.filter((c) => c.status === "archived").length;
  const totalActiveProjects = clientsWithProjects.reduce((sum, c) => sum + c.activeProjects, 0);

  // Helper function to get client initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get avatar style based on status
  const getAvatarStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 border-emerald-200 text-emerald-700";
      case "inactive":
        return "bg-slate-100 border-slate-200 text-slate-600";
      case "archived":
        return "bg-orange-100 border-orange-200 text-orange-600";
      default:
        return "bg-indigo-100 border-indigo-200 text-indigo-700";
    }
  };

  // Helper function to get hover border color
  const getHoverBorderColor = (status: string) => {
    switch (status) {
      case "active":
        return "hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5";
      case "inactive":
        return "hover:border-slate-300 hover:shadow-lg";
      case "archived":
        return "hover:border-rose-200 hover:shadow-lg hover:shadow-rose-500/5";
      default:
        return "hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5";
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-[pulse_3s_ease-in-out_infinite]"></span>
            Active
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider shadow-sm">
            Inactive
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-slate-400 border border-slate-200 uppercase tracking-wider shadow-sm">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2">
              Admin Overview
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              Manage client projects, track progress, and oversee support operations.
            </p>
          </div>
          <InviteTeamMemberDialog />
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Clients Card */}
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[170px] relative overflow-hidden group animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <div className="flex justify-between items-start relative z-10">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Total Clients
              </span>
            </div>

            {/* Illustration Placeholder */}
            <div className="absolute right-4 top-4 opacity-[0.08] text-slate-600 transform group-hover:scale-105 transition-transform duration-500">
              <Users className="w-24 h-24 stroke-[1.5]" />
            </div>

            <div className="relative z-10 mt-6">
              <div className="text-[40px] font-medium text-slate-900 tracking-tighter mb-6 leading-none">
                {totalClients}
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="w-full h-full bg-slate-300"></div>
              </div>
            </div>
          </div>

          {/* Active Projects Card */}
          <div className="bg-white p-7 rounded-2xl border border-indigo-50 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.05)] flex flex-col justify-between min-h-[170px] relative overflow-hidden animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
            {/* Gradient Glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/60 rounded-bl-full -mr-10 -mt-10 blur-xl"></div>

            <div className="flex justify-between items-start relative z-10">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-widest">
                Active Projects
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50/80 flex items-center justify-center text-indigo-500 border border-indigo-100/50">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="relative z-10 mt-6">
              <div className="text-[40px] font-medium text-slate-900 tracking-tighter mb-4 leading-none">
                {totalActiveProjects}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>+50% this month</span>
              </div>
            </div>
          </div>

          {/* Archived Card */}
          <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[170px] animate-on-scroll [animation:animationIn_0.5s_ease-out_0.4s_both]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Archived
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                <Archive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[40px] font-medium text-slate-900 tracking-tighter mb-6 leading-none">
                {archivedClients}
              </div>
              <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-200"
                  style={{ width: `${totalClients > 0 ? (archivedClients / totalClients) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Directory Header */}
        <div className="flex items-center gap-3 mb-6 opacity-80 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.5s_both]">
          <LayoutGrid className="w-4 h-4 text-indigo-500" />
          <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
            Recent Clients
          </h2>
          <div className="h-px bg-slate-200 flex-1 ml-2"></div>
          <Link
            href="/dashboard/admin/clients"
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View All
          </Link>
        </div>

        {/* Client Grid */}
        {clientsWithProjects.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center border border-slate-100 shadow-sm">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-slate-600 text-lg font-medium mb-2">No clients yet</p>
            <p className="text-slate-400 text-sm">Invite your first client to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            {clientsWithProjects.slice(0, 4).map((client, index) => {
              const initials = getInitials(client.companyName);

              // Determine project status text and icon
              let projectStatusText = "";
              let projectStatusIcon = null;
              let projectStatusStyle = "";

              if (client.activeProjects > 0) {
                projectStatusText = `${client.activeProjects} active project${client.activeProjects > 1 ? "s" : ""}`;
                projectStatusIcon = <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />;
                projectStatusStyle = "bg-slate-50 border-slate-100 text-slate-600";
              } else if (client.status === "active") {
                projectStatusText = "All tasks completed";
                projectStatusIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
                projectStatusStyle = "bg-slate-50 border-slate-100 text-slate-600";
              }

              // Add grayscale for inactive clients
              const cardOpacity = client.status === "inactive" ? "opacity-70 grayscale hover:grayscale-0 hover:opacity-100" : "";

              return (
                <Link
                  key={client.id}
                  href={`/dashboard/admin/clients/${client.id}`}
                  className={`group bg-white p-6 rounded-2xl border border-slate-100 ${getHoverBorderColor(client.status)} transition-all duration-300 relative ${cardOpacity} animate-on-scroll`}
                  style={{ animation: `animationIn 0.5s ease-out ${0.6 + index * 0.1}s both` }}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-[15px] font-semibold tracking-tight shadow-sm ${getAvatarStyle(client.status)}`}>
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 mb-0.5 group-hover:text-indigo-700 transition-colors tracking-tight">
                          {client.companyName}
                        </h3>
                        <div className="flex flex-col text-sm text-slate-500">
                          <span className="font-medium text-slate-700">{client.contactName}</span>
                          <span className="text-slate-400 text-xs">{client.contactEmail}</span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(client.status)}
                  </div>
                  {projectStatusText && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium ${projectStatusStyle}`}>
                      {projectStatusIcon}
                      <span>{projectStatusText}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
