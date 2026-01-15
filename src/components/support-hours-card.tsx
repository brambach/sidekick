"use client";

import { useEffect, useState } from "react";
import { Clock, Settings } from "lucide-react";
import { EditSupportHoursDialog } from "@/components/edit-support-hours-dialog";

interface SupportHoursData {
  allocatedHours: number;
  usedHours: number;
  remainingHours: number;
  percentageUsed: number;
  billingCycleStart: string | null;
}

interface SupportHoursCardProps {
  clientId: string;
  isAdmin?: boolean;
}

export function SupportHoursCard({ clientId, isAdmin = false }: SupportHoursCardProps) {
  const [data, setData] = useState<SupportHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/support-hours`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching support hours:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleUpdate = () => {
    setEditDialogOpen(false);
    fetchData(); // Refresh data after update
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
          <div className="h-12 bg-slate-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const hasHours = data.allocatedHours > 0;
  const isOverUsed = data.usedHours > data.allocatedHours;
  const isNearLimit = data.percentageUsed >= 80 && !isOverUsed;

  return (
    <>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-900">Support Hours</h3>
          </div>
          {isAdmin && (
            <button
              onClick={() => setEditDialogOpen(true)}
              className="text-slate-400 hover:text-purple-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>

        {!hasHours ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-3">No support package configured</p>
            {isAdmin && (
              <button
                onClick={() => setEditDialogOpen(true)}
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Set up support hours
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="text-3xl font-bold text-slate-900">
                  {data.remainingHours}
                </span>
                <span className="text-sm text-slate-500 ml-2">hours remaining</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">
                  {data.usedHours} of {data.allocatedHours} hrs used
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isOverUsed
                    ? "bg-gradient-to-r from-rose-500 to-rose-600"
                    : isNearLimit
                    ? "bg-gradient-to-r from-orange-500 to-orange-600"
                    : "bg-gradient-to-r from-purple-500 to-purple-600"
                }`}
                style={{
                  width: `${Math.min(data.percentageUsed, 100)}%`,
                }}
              />
            </div>

            {/* Status Message */}
            <div className="mt-3 flex items-center justify-between text-xs">
              {isOverUsed ? (
                <span className="text-rose-600 font-medium">
                  Over allocated hours by {Math.abs(data.remainingHours)} hrs
                </span>
              ) : isNearLimit ? (
                <span className="text-orange-600 font-medium">
                  {data.percentageUsed}% used - Running low
                </span>
              ) : (
                <span className="text-slate-500">{data.percentageUsed}% used</span>
              )}

              {data.billingCycleStart && (
                <span className="text-slate-400">
                  Cycle started {new Date(data.billingCycleStart).toLocaleDateString()}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <EditSupportHoursDialog
          clientId={clientId}
          currentHours={data.allocatedHours}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
}
