"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { generateUploadButton, generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const { uploadFiles } = generateReactHelpers<OurFileRouter>();

export function FileUploaderSimple({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log("📁 Files selected:", Array.from(files).map(f => f.name));
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload to UploadThing with progress tracking
      console.log("🚀 Starting upload...");

      const uploadPromise = uploadFiles("projectFile", {
        files: Array.from(files),
        onUploadProgress: ({ progress }) => {
          console.log("📊 Progress:", progress);
          setUploadProgress(progress);
        },
      });

      // Set a timeout - if it takes more than 10 seconds after reaching 100%, something is wrong
      const uploadedFiles = await Promise.race([
        uploadPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Upload timed out - this is expected in local development")), 15000)
        ),
      ]);

      console.log("✅ Upload complete! Files:", uploadedFiles);

      // Save each file to our database
      for (const file of uploadedFiles) {
        console.log("💾 Saving to database:", file.name);

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
          throw new Error(`Failed to save file: ${errorText}`);
        }

        console.log("✅ Saved:", file.name);
      }

      alert(`Successfully uploaded ${uploadedFiles.length} file(s)!`);
      router.refresh();
      setIsUploading(false);
      setUploadProgress(0);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsUploading(false);
      setUploadProgress(0);
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
        disabled={isUploading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading... {uploadProgress}%</span>
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
