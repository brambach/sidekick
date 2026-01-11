"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing";
import { Upload, Loader2 } from "lucide-react";

export function FileUploaderV2({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing("projectFile", {
    skipPolling: false,
    onClientUploadComplete: async (files) => {
      console.log("✅ Upload complete!", files);

      // Save each uploaded file to the database
      try {
        for (const file of files) {
          console.log("Saving file to database:", file);

          const response = await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              name: file.name,
              fileUrl: file.url,
              fileSize: file.size,
              fileType: file.type || "application/octet-stream",
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to save file:", errorText);
            throw new Error(`Failed to save file: ${errorText}`);
          }

          console.log("✅ File saved successfully");
        }

        alert("Files uploaded successfully!");
        router.refresh();
        setIsUploading(false);
      } catch (error) {
        console.error("Error saving files:", error);
        alert("Files uploaded but failed to save. Please refresh.");
        setIsUploading(false);
      }
    },
    onUploadError: (error) => {
      console.error("❌ Upload error:", error);
      alert(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
    onUploadBegin: (fileName) => {
      console.log("🚀 Upload started for:", fileName);
      setIsUploading(true);
    },
    onUploadProgress: (progress) => {
      console.log("📊 Upload progress:", progress);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log("Files selected:", Array.from(files));
    setIsUploading(true);

    try {
      const result = await startUpload(Array.from(files));
      console.log("startUpload result:", result);

      if (!result) {
        console.error("No result from startUpload");
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.zip,.doc,.docx,.xls,.xlsx"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || uploadThingUploading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading || uploadThingUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </>
        )}
      </button>
    </>
  );
}
