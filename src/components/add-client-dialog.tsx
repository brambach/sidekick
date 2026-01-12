"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    status: "active",
    sendInvite: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create client");
      }

      const { client } = await response.json();

      // Send invite if checkbox is checked
      if (formData.sendInvite) {
        try {
          const inviteResponse = await fetch("/api/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: formData.contactEmail,
              role: "client",
              clientId: client.id,
            }),
          });

          if (!inviteResponse.ok) {
            console.error("Failed to send invite, but client was created");
            toast.success("Client created successfully, but invite failed to send");
          } else {
            toast.success(`Client created and invite sent to ${formData.contactEmail}`);
          }
        } catch (inviteError) {
          console.error("Error sending invite:", inviteError);
          toast.success("Client created successfully, but invite failed to send");
        }
      } else {
        toast.success("Client created successfully");
      }

      // Reset form and close dialog
      setFormData({ companyName: "", contactName: "", contactEmail: "", status: "active", sendInvite: true });
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2 shadow-sm text-sm font-medium group">
          <Plus className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <span>Add Client</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client profile. They&apos;ll be able to view projects and files you assign to them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              required
              placeholder="Acme Healthcare Partners"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              required
              placeholder="Sarah Johnson"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              required
              placeholder="sarah.johnson@acmehealthcare.com"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="sendInvite"
              checked={formData.sendInvite}
              onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
            />
            <label htmlFor="sendInvite" className="text-sm text-gray-700 cursor-pointer">
              Send portal invite email to contact
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
