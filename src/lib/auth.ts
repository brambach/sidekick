import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "./db";
import { users } from "./db/schema";
import { eq, isNull, and } from "drizzle-orm";
import type { User, UserWithProfile, UserRole, ClerkPublicMetadata } from "./types";

/**
 * Get current user from database (DB user only, for role/permissions)
 * Auto-creates user in DB if they don't exist (e.g., new sign-ups)
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  // Try to get user from database (including soft-deleted)
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  // If user doesn't exist in DB, create them (new sign-up)
  if (!user) {
    const metadata = (sessionClaims?.metadata as { role?: string }) || {};
    const role = (metadata.role || "client") as "admin" | "client";

    try {
      const [newUser] = await db
        .insert(users)
        .values({
          clerkId: userId,
          role: role,
          agencyId: null,
          clientId: null,
        })
        .returning();

      user = newUser;
    } catch (error) {
      // If insert fails (duplicate key), fetch the existing user
      console.error("Error creating user, fetching existing:", error);
      [user] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1);
    }
  }

  // If user was soft-deleted, un-delete them
  if (user && user.deletedAt) {
    const [reactivatedUser] = await db
      .update(users)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    user = reactivatedUser;
  }

  return user || null;
}

/**
 * Get current user with Clerk profile data (for display purposes)
 */
export async function getUserWithProfile(): Promise<UserWithProfile | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [dbUser, clerkUser] = await Promise.all([
    db
      .select()
      .from(users)
      .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null),
    (await clerkClient()).users.getUser(userId),
  ]);

  if (!dbUser) {
    return null;
  }

  return {
    ...dbUser,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
    avatarUrl: clerkUser.imageUrl,
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  return user;
}

/**
 * Require admin role - throws if not admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();

  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

/**
 * Get user role from Clerk public metadata
 */
export function getUserRole(metadata: ClerkPublicMetadata | undefined): UserRole {
  return metadata?.role || "client";
}
