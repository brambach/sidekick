import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { Building2, Palette } from "lucide-react";
import { AgencySettingsForm } from "@/components/agency-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();

  // Fetch agency (assuming single agency for MVP)
  const agency = await db
    .select()
    .from(agencies)
    .where(isNull(agencies.deletedAt))
    .limit(1)
    .then((rows) => rows[0]);

  if (!agency) {
    return (
      <div className="max-w-[800px] mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">No agency found. Please run the seed script.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your agency configuration and branding.</p>
      </div>

      {/* Agency Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: agency.primaryColor + "20" }}
          >
            <Building2
              className="w-6 h-6"
              style={{ color: agency.primaryColor }}
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{agency.name}</h2>
            <p className="text-sm text-gray-500">Agency ID: {agency.id.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Primary Color</p>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: agency.primaryColor }}
              />
              <span className="text-sm text-gray-900 font-mono">{agency.primaryColor}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Domain</p>
            <p className="text-sm text-gray-900">{agency.domain || "Not set"}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Branding</h3>
        </div>
        <AgencySettingsForm agency={agency} />
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-1">White-Label Branding</p>
        <p className="text-xs text-blue-700">
          Your primary color is used throughout the client-facing portal. Clients will see your agency branding when they log in to view their projects.
        </p>
      </div>
    </div>
  );
}
