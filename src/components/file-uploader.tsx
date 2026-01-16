"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload, isUploading: uploadThingLoading } = useUploadThing("projectFile", {
    onBeforeUploadBegin: (files) => {
      console.log("Starting upload for files:", files);
      setIsUploading(true);
      return files;
    },
    onClientUploadComplete: async (res) => {
      console.log("✅ UploadThing upload complete:", res);
      console.log("Now saving to database...");

      // Save each uploaded file to the database
      try {
        for (const file of res) {
          console.log("Saving file to DB:", {
            name: file.name,
            url: file.url,
            size: file.size,
            type: file.type
          });

          const response = await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              name: file.name,
              fileUrl: file.url,
              fileSize: file.size,
              fileType: file.type,
            }),
          });

          console.log("API response status:", response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ API error response:", errorText);
            throw new Error(`Failed to save file: ${errorText}`);
          }

          const result = await response.json();
          console.log("✅ File saved to DB successfully:", result);
        }

        console.log("All files processed, refreshing page...");
        toast.success(`${res.length} file${res.length > 1 ? 's' : ''} uploaded successfully`);
        setIsUploading(false);
        router.refresh();
      } catch (error) {
        console.error("❌ Error in onClientUploadComplete:", error);
        toast.error(error instanceof Error ? error.message : "Failed to save files. Please try again.");
        setIsUploading(false);
      }
    },
    onUploadError: (error: Error) => {
      console.error("❌ UploadThing error:", error);
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    startUpload(fileArray);
  };

  return (
    <label>
      <input
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading || uploadThingLoading}
      />
      <Button
        type="button"
        disabled={isUploading || uploadThingLoading}
        asChild
      >
        <span className="cursor-pointer">
          <Upload className="w-4 h-4" />
          {isUploading || uploadThingLoading ? "Uploading..." : "Upload Files"}
        </span>
      </Button>
    </label>
  );
}
