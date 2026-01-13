"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UpdateStatusDialogProps {
  projectId: string;
  currentStatus: string;
}

const statuses = [
  { value: "planning", label: "Planning", color: "bg-slate-50 text-slate-600 border-slate-200" },
  { value: "in_progress", label: "In Progress", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  { value: "review", label: "In Review", color: "bg-purple-50 text-purple-600 border-purple-200" },
  { value: "completed", label: "Completed", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { value: "on_hold", label: "On Hold", color: "bg-orange-50 text-orange-600 border-orange-200" },
];

export function UpdateStatusDialog({ projectId, currentStatus }: UpdateStatusDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
      setOpen(false);
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg transition-all hover:bg-indigo-700 text-sm font-medium shadow-sm">
          Update Status
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Project Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Select Status</Label>
            <div className="grid gap-2 mt-2">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setSelectedStatus(status.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    selectedStatus === status.value
                      ? `${status.color} ring-2 ring-indigo-500`
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span className="font-medium">{status.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Status"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
