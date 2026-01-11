"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

export function FileUploaderCustom({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log("📁 Files selected:", Array.from(files).map(f => f.name));
    setIsUploading(true);
    setProgress(0);

    try {
      for (const file of Array.from(files)) {
        console.log(`🚀 Uploading: ${file.name}`);

        // Step 1: Get presigned URL from our API
        const uploadResponse = await fetch(
          `/api/uploadthing?actionType=upload&slug=projectFile`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files: [{ name: file.name, size: file.size, type: file.type }],
            }),
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const uploadData = await uploadResponse.json();
        console.log("Got presigned URL response:", uploadData);
        console.log("Full structure:", JSON.stringify(uploadData, null, 2));

        // The response is an array directly, not wrapped in data
        const { url: presignedUrl, key } = uploadData[0];

        // Step 2: Upload directly to UploadThing
        setProgress(50);
        console.log("📤 Uploading to UploadThing:", presignedUrl);

        // UploadThing expects multipart/form-data
        const formData = new FormData();
        formData.append("file", file);

        const s3Response = await fetch(presignedUrl, {
          method: "POST",
          body: formData,
        });

        console.log("UploadThing Response status:", s3Response.status);
        console.log("UploadThing Response headers:", Object.fromEntries(s3Response.headers.entries()));

        if (!s3Response.ok) {
          const errorText = await s3Response.text();
          console.error("UploadThing Error response:", errorText);
          throw new Error(`Failed to upload: ${s3Response.status} - ${errorText}`);
        }

        console.log("✅ Uploaded to UploadThing");
        setProgress(75);

        // Step 3: Construct the final URL (UploadThing's URL pattern)
        const fileUrl = `https://utfs.io/f/${key}`;
        console.log("📎 File URL:", fileUrl);

        // Step 4: Save to our database
        const saveResponse = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: file.name,
            fileUrl,
            fileSize: file.size,
            fileType: file.type,
          }),
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save file: ${errorText}`);
        }

        console.log("✅ Saved to database:", file.name);
        setProgress(100);
      }

      alert(`Successfully uploaded ${files.length} file(s)!`);
      router.refresh();
      setIsUploading(false);
      setProgress(0);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsUploading(false);
      setProgress(0);
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
            <span>Uploading... {progress}%</span>
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
