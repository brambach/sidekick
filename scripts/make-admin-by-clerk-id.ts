/**
 * Make a user an admin by Clerk ID
 */

// Load environment variables FIRST
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

import { clerkClient } from "@clerk/nextjs/server";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function makeAdminByClerkId(clerkId: string) {
  console.log(`\n🔍 Looking for user with Clerk ID: ${clerkId}...`);

  try {
    // Get Clerk client
    const clerk = await clerkClient();

    // Get user from Clerk
    const clerkUser = await clerk.users.getUser(clerkId);
    console.log(`✅ Found user in Clerk: ${clerkUser.emailAddresses[0]?.emailAddress}`);

    // Update role in Clerk metadata
    await clerk.users.updateUser(clerkUser.id, {
      publicMetadata: {
        role: "admin",
      },
    });
    console.log("✅ Updated role in Clerk to 'admin'");

    // Update role in database
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1)
      .then((rows) => rows[0]);

    if (dbUser) {
      await db
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.id, dbUser.id));
      console.log("✅ Updated role in Database to 'admin'");
    } else {
      // Create user in database if doesn't exist
      await db.insert(users).values({
        clerkId: clerkId,
        role: "admin",
        agencyId: null,
        clientId: null,
      });
      console.log("✅ Created user in Database with role 'admin'");
    }

    console.log("\n🎉 Success! User is now an admin.");
    console.log("💡 Sign out and sign back in to see admin dashboard.");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Get Clerk ID from command line
const clerkId = process.argv[2];

if (!clerkId) {
  console.error("❌ Please provide a Clerk user ID");
  console.log("\nUsage: tsx scripts/make-admin-by-clerk-id.ts <clerk-user-id>");
  console.log("Example: tsx scripts/make-admin-by-clerk-id.ts user_2abc123xyz");
  process.exit(1);
}

makeAdminByClerkId(clerkId);
