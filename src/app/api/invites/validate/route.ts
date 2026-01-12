import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invites, clients } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

// POST - Validate an invite token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find invite
    const invite = await db
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        status: invites.status,
        clientId: invites.clientId,
        expiresAt: invites.expiresAt,
        clientName: clients.companyName,
      })
      .from(invites)
      .leftJoin(clients, eq(invites.clientId, clients.id))
      .where(eq(invites.token, token))
      .limit(1)
      .then((rows) => rows[0]);

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite token", valid: false },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json(
        { error: "Invite has expired", valid: false },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (invite.status === "accepted") {
      return NextResponse.json(
        { error: "Invite has already been accepted", valid: false },
        { status: 400 }
      );
    }

    // Return invite details
    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        role: invite.role,
        clientName: invite.clientName,
      },
    });
  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
