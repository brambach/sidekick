"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, CheckCircle, XCircle, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteClientDialog } from "./delete-client-dialog";

interface ClientStatusMenuProps {
  clientId: string;
  currentStatus: string;
  companyName: string;
}

export function ClientStatusMenu({ clientId, currentStatus, companyName }: ClientStatusMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/clients/${clientId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update client status");
      }

      const statusLabels: Record<string, string> = {
        active: "Active",
        inactive: "Inactive",
        archived: "Archived",
      };

      toast.success(`${companyName} marked as ${statusLabels[newStatus]}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error("Failed to update client status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 hover:bg-slate-50 rounded-md transition-colors"
            disabled={loading}
            aria-label="Change client status"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => handleStatusChange("active")}
            disabled={currentStatus === "active" || loading}
            className="cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" strokeWidth={1.5} />
            <span>Mark as Active</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusChange("inactive")}
            disabled={currentStatus === "inactive" || loading}
            className="cursor-pointer"
          >
            <XCircle className="w-4 h-4 mr-2 text-slate-400" strokeWidth={1.5} />
            <span>Mark as Inactive</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusChange("archived")}
            disabled={currentStatus === "archived" || loading}
            className="cursor-pointer"
          >
            <Archive className="w-4 h-4 mr-2 text-slate-400" strokeWidth={1.5} />
            <span>Archive</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
            <span>Delete Permanently</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        clientId={clientId}
        companyName={companyName}
      />
    </>
  );
}
