import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import { users } from "./schema";
import { createClerkClient } from "@clerk/backend";
import { ne, eq } from "drizzle-orm";

const db = drizzle(sql);

async function cleanupUsers() {
  console.log("🧹 Cleaning up users...");

  try {
    // Get Clerk client
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    // Find bryce.rambach@gmail.com in Clerk
    const clerkUsers = await clerk.users.getUserList({
      emailAddress: ["bryce.rambach@gmail.com"],
    });

    if (clerkUsers.data.length === 0) {
      console.log("❌ Could not find bryce.rambach@gmail.com in Clerk");
      process.exit(1);
    }

    const bryceClerkId = clerkUsers.data[0].id;
    console.log(`✓ Found bryce.rambach@gmail.com (Clerk ID: ${bryceClerkId})`);

    // Find Bryce's user record in database
    const [bryceUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, bryceClerkId))
      .limit(1);

    if (!bryceUser) {
      console.log("❌ Could not find bryce.rambach@gmail.com in database");
      process.exit(1);
    }

    console.log(`✓ Found user in database (ID: ${bryceUser.id})`);

    // Delete all users except Bryce
    const result = await db.delete(users).where(ne(users.id, bryceUser.id));

    console.log("");
    console.log("✅ Cleanup completed successfully!");
    console.log(`✓ Kept user: bryce.rambach@gmail.com`);
    console.log(`✓ Deleted all other users`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupUsers();
