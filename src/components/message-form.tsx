"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MessageForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setContent("");
      router.refresh();
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
      <textarea
        placeholder="Type a message..."
        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg transition-all hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          disabled={loading || !content.trim()}
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}
