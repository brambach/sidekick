import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "./db";
import { users } from "./db/schema";
import { eq, isNull, and } from "drizzle-orm";
import type { User, UserWithProfile, UserRole, ClerkPublicMetadata } from "./types";

/**
 * Get current user from database (DB user only, for role/permissions)
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)))
    .limit(1);

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
