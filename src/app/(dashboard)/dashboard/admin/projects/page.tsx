import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import Link from "next/link";
import { FolderOpen, Clock, CheckCircle, AlertCircle, Pause, FileSearch, LayoutGrid } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export const dynamic = "force-dynamic";

// Helper function to get status badge styles
function getStatusBadge(status: string): { bg: string; text: string; border: string; label: string; icon: any } {
  switch (status) {
    case "in_progress":
      return {
        bg: "bg-indigo-50",
        text: "text-indigo-600",
        border: "border-indigo-200",
        label: "In Progress",
        icon: FolderOpen
      };
    case "review":
      return {
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-200",
        label: "In Review",
        icon: FileSearch
      };
    case "completed":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
        label: "Completed",
        icon: CheckCircle
      };
    case "on_hold":
      return {
        bg: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-200",
        label: "On Hold",
        icon: Pause
      };
    case "planning":
      return {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "border-slate-200",
        label: "Planning",
        icon: Clock
      };
    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-500",
        border: "border-slate-200",
        label: status,
        icon: FolderOpen
      };
  }
}

export default async function ProjectsPage() {
  await requireAdmin();

  // Fetch all clients for the project form
  const allClients = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
    })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(clients.companyName);

  // Fetch all projects with their client info
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
      clientName: clients.companyName,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(isNull(projects.deletedAt))
    .orderBy(projects.createdAt);

  // Calculate stats
  const totalProjects = allProjects.length;
  const activeProjects = allProjects.filter((p) =>
    p.status === "in_progress" || p.status === "planning" || p.status === "review"
  ).length;
  const completedProjects = allProjects.filter((p) => p.status === "completed").length;

  // Check for overdue projects
  const now = new Date();
  const overdueProjects = allProjects.filter((p) =>
    p.dueDate && new Date(p.dueDate) < now && p.status !== "completed"
  ).length;

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="max-w-2xl">
            <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2">
              Projects Overview
            </h1>
            <p className="text-slate-500 text-[15px] leading-relaxed font-light">
              Manage all client projects and deliverables across your portfolio.
            </p>
          </div>
          <AddProjectDialog clients={allClients} />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Total Projects */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Total</span>
              <FolderOpen className="text-slate-400 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-[32px] font-medium text-slate-900 tracking-tight">{totalProjects}</div>
          </div>

          {/* Active Projects */}
          <div className="bg-white p-6 rounded-2xl border border-indigo-50 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.05)] flex flex-col justify-between animate-on-scroll [animation:animationIn_0.5s_ease-out_0.3s_both]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-widest">Active</span>
              <Clock className="text-indigo-500 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-[32px] font-medium text-slate-900 tracking-tight">{activeProjects}</div>
          </div>

          {/* Completed Projects */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-50 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.05)] flex flex-col justify-between animate-on-scroll [animation:animationIn_0.5s_ease-out_0.4s_both]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest">Completed</span>
              <CheckCircle className="text-emerald-500 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-[32px] font-medium text-slate-900 tracking-tight">{completedProjects}</div>
          </div>

          {/* Overdue Projects */}
          <div className="bg-white p-6 rounded-2xl border border-rose-50 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.05)] flex flex-col justify-between animate-on-scroll [animation:animationIn_0.5s_ease-out_0.5s_both]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-widest">Overdue</span>
              <AlertCircle className="text-rose-500 w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-[32px] font-medium text-slate-900 tracking-tight">{overdueProjects}</div>
          </div>
        </div>

        {/* Directory Header */}
        <div className="flex items-center gap-3 mb-6 opacity-80 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.6s_both]">
          <LayoutGrid className="w-4 h-4 text-indigo-500" />
          <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
            All Projects
          </h2>
          <div className="h-px bg-slate-200 flex-1 ml-2"></div>
        </div>

        {/* Projects List */}
        <div className="space-y-4 pb-12">
          {allProjects.map((project, index) => {
            const statusBadge = getStatusBadge(project.status);
            const StatusIcon = statusBadge.icon;
            const isOverdue = project.dueDate && new Date(project.dueDate) < now && project.status !== "completed";

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group animate-on-scroll"
                style={{ animation: `animationIn 0.5s ease-out ${0.7 + index * 0.05}s both` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <StatusIcon className={`w-5 h-5 ${statusBadge.text}`} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 tracking-tight leading-tight group-hover:text-indigo-700 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {project.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                          <span className="font-medium text-slate-700">{project.clientName}</span>
                          {project.dueDate && (
                            <span className={isOverdue ? "text-rose-600 font-semibold" : ""}>
                              Due {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} shadow-sm uppercase tracking-wider`}
                    >
                      {statusBadge.label}
                    </span>
                    <Link
                      href={`/dashboard/admin/projects/${project.id}`}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
