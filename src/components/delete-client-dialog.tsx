"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  companyName: string;
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  clientId,
  companyName,
}: DeleteClientDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete client");
      }

      toast.success(`${companyName} permanently deleted`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently Delete Client?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="font-semibold text-gray-900">
                Are you sure you want to permanently delete <span className="text-red-600">{companyName}</span>?
              </p>
              <p>
                This action <span className="font-semibold text-red-600">cannot be undone</span>. All
                associated data will be permanently removed:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All projects</li>
                <li>All files and documents</li>
                <li>All messages and conversations</li>
                <li>All support tickets</li>
                <li>Activity history</li>
              </ul>
              <p className="font-medium pt-2">
                If you just want to pause the relationship, consider marking them as{" "}
                <span className="text-gray-600">Inactive</span> or{" "}
                <span className="text-gray-600">Archived</span> instead.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? "Deleting..." : "Yes, Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
