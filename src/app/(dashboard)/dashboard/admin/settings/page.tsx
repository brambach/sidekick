import { requireAdmin } from "@/lib/auth";
import { LayoutGrid, Settings as SettingsIcon } from "lucide-react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { PhaseTemplateList } from "@/components/phase-template-list";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <>
      <AnimateOnScroll />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="mb-12 animate-on-scroll [animation:animationIn_0.5s_ease-out_0.1s_both]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-600 text-[11px] font-semibold mb-4 uppercase tracking-wider">
            <SettingsIcon className="w-3.5 h-3.5" />
            Admin Settings
          </div>
          <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight mb-2">
            Settings
          </h1>
          <p className="text-slate-500 text-[15px] leading-relaxed font-light">
            Manage global settings and configurations for the Digital Directions
            portal.
          </p>
        </div>

        {/* Phase Templates Section */}
        <div className="animate-on-scroll [animation:animationIn_0.5s_ease-out_0.2s_both]">
          <div className="flex items-center gap-3 mb-6 opacity-80">
            <LayoutGrid className="w-4 h-4 text-purple-500" />
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
              Phase Templates
            </h2>
            <div className="h-px bg-slate-200 flex-1 ml-2"></div>
          </div>

          <PhaseTemplateList />
        </div>

        {/* Future settings sections can go here */}
      </div>
    </>
  );
}
