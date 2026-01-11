import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  const eventType = evt.type;

  try {
    switch (eventType) {
      case "user.created": {
        const { id, public_metadata } = evt.data;

        const role = (public_metadata?.role as string) || "client";
        const agencyId = public_metadata?.agencyId as string | undefined;
        const clientId = public_metadata?.clientId as string | undefined;

        await db.insert(users).values({
          clerkId: id,
          role: role as "admin" | "client",
          agencyId: agencyId || null,
          clientId: clientId || null,
        });

        console.log(`User created: ${id}`);
        break;
      }

      case "user.updated": {
        const { id, public_metadata } = evt.data;

        const role = (public_metadata?.role as string) || "client";
        const agencyId = public_metadata?.agencyId as string | undefined;
        const clientId = public_metadata?.clientId as string | undefined;

        await db
          .update(users)
          .set({
            role: role as "admin" | "client",
            agencyId: agencyId || null,
            clientId: clientId || null,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, id));

        console.log(`User updated: ${id}`);
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;

        if (id) {
          // Soft delete
          await db
            .update(users)
            .set({ deletedAt: new Date() })
            .where(eq(users.clerkId, id));

          console.log(`User soft deleted: ${id}`);
        }

        break;
      }
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
