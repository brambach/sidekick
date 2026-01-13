import { requireAuth } from "@/lib/auth";
import { FolderOpen } from "lucide-react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage() {
  await requireAuth();

  return (
    <>
      <AnimateOnScroll />
      <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-12 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          My Projects
        </h1>

        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
          <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-lg font-medium text-slate-600 mb-2">No projects yet</p>
          <p className="text-slate-400 text-sm">
            Your Digital Directions consultant will set up projects for you.
          </p>
        </div>
      </div>
    </>
  );
}
