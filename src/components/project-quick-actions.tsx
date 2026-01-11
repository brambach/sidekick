"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProjectQuickActionsProps {
  projectId: string;
}

export function ProjectQuickActions({ projectId }: ProjectQuickActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMarkCompleted = async () => {
    if (!confirm("Mark this project as completed?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to mark as completed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToFiles = () => {
    const filesSection = document.querySelector('[data-section="files"]');
    if (filesSection) {
      filesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
      <p className="text-sm text-blue-900 font-medium mb-2">Quick Actions</p>
      <div className="space-y-2">
        <button
          onClick={handleMarkCompleted}
          disabled={loading}
          className="w-full text-left text-sm text-blue-700 hover:text-blue-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Updating..." : "Mark as completed"}
        </button>
        <button
          onClick={scrollToFiles}
          className="w-full text-left text-sm text-blue-700 hover:text-blue-800 transition-colors"
        >
          Upload deliverables
        </button>
      </div>
    </div>
  );
}
