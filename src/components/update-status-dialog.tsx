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
  { value: "planning", label: "Planning", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { value: "review", label: "In Review", color: "bg-purple-50 text-purple-700 border-purple-100" },
  { value: "completed", label: "Completed", color: "bg-green-50 text-green-700 border-green-100" },
  { value: "on_hold", label: "On Hold", color: "bg-orange-50 text-orange-700 border-orange-100" },
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
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
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
                  className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                    selectedStatus === status.value
                      ? `${status.color} ring-2 ring-offset-2 ring-blue-500`
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{status.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
