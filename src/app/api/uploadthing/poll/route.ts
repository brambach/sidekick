import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    const { fileKeys } = await req.json();

    console.log("📡 Polling for files:", fileKeys);

    // Get file data from UploadThing
    const files = await utapi.getFileUrls(fileKeys);

    console.log("✅ Got file URLs:", files);

    return NextResponse.json(files);
  } catch (error) {
    console.error("❌ Error polling UploadThing:", error);
    return NextResponse.json(
      { error: "Failed to get file info" },
      { status: 500 }
    );
  }
}
