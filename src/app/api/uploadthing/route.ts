import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
import { NextRequest } from "next/server";

const handlers = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN,
    isDev: process.env.NODE_ENV === "development",
  },
});

export async function GET(req: NextRequest) {
  console.log("[UPLOADTHING] GET request:", req.nextUrl.searchParams.toString());
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  console.log("[UPLOADTHING] POST request:", req.nextUrl.searchParams.toString());
  return handlers.POST(req);
}
