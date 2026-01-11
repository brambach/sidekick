"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Agency {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
}

export function AgencySettingsForm({ agency }: { agency: Agency }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: agency.name,
    primaryColor: agency.primaryColor,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/agency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update agency");
      }

      router.refresh();
      alert("Agency settings updated successfully!");
    } catch (error) {
      console.error("Error updating agency:", error);
      alert("Failed to update settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Agency Name *</Label>
        <Input
          id="name"
          required
          placeholder="Apex Design Studio"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="primaryColor">Primary Brand Color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="primaryColor"
            type="color"
            className="w-20 h-10 cursor-pointer"
            value={formData.primaryColor}
            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
          />
          <Input
            type="text"
            placeholder="#3B82F6"
            value={formData.primaryColor}
            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-gray-500">Used for client-facing branding</p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="submit"
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
