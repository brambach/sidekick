"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
import { Upload } from "lucide-react";

export function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  return (
    <UploadButton
      endpoint="projectFile"
      onBeforeUploadBegin={(files) => {
        console.log("onBeforeUploadBegin triggered with files:", files);
        setIsUploading(true);
        return files;
      }}
      onClientUploadComplete={async (res) => {
        console.log("Upload complete, received files:", res);

        // Save each uploaded file to the database
        try {
          for (const file of res) {
            console.log("Saving file to database:", file);

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

            if (!response.ok) {
              const errorText = await response.text();
              console.error("Failed to save file:", errorText);
              throw new Error(`Failed to save file: ${errorText}`);
            }

            console.log("File saved successfully");
          }

          console.log("All files saved, refreshing page");
          router.refresh();
          setIsUploading(false);
        } catch (error) {
          console.error("Error saving files:", error);
          alert("Files uploaded but failed to save. Please refresh.");
          setIsUploading(false);
        }
      }}
      onUploadError={(error: Error) => {
        console.error("Upload error:", error);
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        alert(`Upload failed: ${error.message}`);
        setIsUploading(false);
      }}
      appearance={{
        button:
          "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2 shadow-sm ut-uploading:cursor-not-allowed",
        allowedContent: "hidden",
      }}
      content={{
        button({ ready }) {
          if (isUploading || !ready) return "Uploading...";
          return (
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </div>
          );
        },
      }}
    />
  );
}
