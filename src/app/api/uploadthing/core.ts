import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

const f = createUploadthing();

export const ourFileRouter = {
  agencyLogo: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("Unauthorized");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user || user.role !== "admin") {
        throw new UploadThingError("Only admins can upload agency logos");
      }

      return { userId: user.id, agencyId: user.agencyId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        url: file.url,
        agencyId: metadata.agencyId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
