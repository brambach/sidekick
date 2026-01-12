import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import {
  users,
  agencies,
  clients,
  projects,
  files,
  messages,
  clientActivity,
} from "./schema";

const db = drizzle(sql);

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log("Clearing existing data...");
    await db.delete(messages);
    await db.delete(files);
    await db.delete(clientActivity);
    await db.delete(projects);
    await db.delete(users);
    await db.delete(clients);
    await db.delete(agencies);

    console.log("✓ Cleared existing data");

    // Create agency
    const [agency] = await db
      .insert(agencies)
      .values({
        name: "Digital Directions",
        logoUrl: "https://picsum.photos/seed/digitaldirections/200/200",
        primaryColor: "#8B5CF6",
        domain: "portal.digitaldirections.com",
      })
      .returning();

    console.log(`✓ Created agency: ${agency.name}`);

    // Create clients
    const [meridian, pinnacle, atlas, horizon] = await db
      .insert(clients)
      .values([
        {
          agencyId: agency.id,
          companyName: "Meridian Healthcare Group",
          contactName: "Jennifer Walsh",
          contactEmail: "jennifer.walsh@meridianhealthcare.com",
          status: "active",
        },
        {
          agencyId: agency.id,
          companyName: "Pinnacle Financial Services",
          contactName: "Robert Chen",
          contactEmail: "r.chen@pinnaclefs.com",
          status: "active",
        },
        {
          agencyId: agency.id,
          companyName: "Atlas Manufacturing",
          contactName: "Sarah Mitchell",
          contactEmail: "smitchell@atlasmfg.com",
          status: "active",
        },
        {
          agencyId: agency.id,
          companyName: "Horizon Tech Solutions",
          contactName: "David Park",
          contactEmail: "dpark@horizontech.io",
          status: "archived",
        },
      ])
      .returning();

    console.log(
      `✓ Created clients: ${[meridian, pinnacle, atlas, horizon]
        .map((c) => c.companyName)
        .join(", ")}`
    );

    // Create admin user
    const [adminUser] = await db
      .insert(users)
      .values({
        clerkId: "demo_admin_clerk_id",
        role: "admin",
        agencyId: agency.id,
      })
      .returning();

    // Create client users
    const [meridianUser, pinnacleUser, atlasUser] = await db
      .insert(users)
      .values([
        {
          clerkId: "demo_meridian_clerk_id",
          role: "client",
          clientId: meridian.id,
        },
        {
          clerkId: "demo_pinnacle_clerk_id",
          role: "client",
          clientId: pinnacle.id,
        },
        {
          clerkId: "demo_atlas_clerk_id",
          role: "client",
          clientId: atlas.id,
        },
      ])
      .returning();

    console.log("✓ Created users (1 admin, 3 clients)");

    // Create projects
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const [project1, project2, project3, project4] = await db
      .insert(projects)
      .values([
        {
          clientId: meridian.id,
          name: "HiBob → ADP Payroll Integration",
          description:
            "Configure bi-directional sync between HiBob and ADP for payroll processing, tax calculations, and employee compensation data.",
          status: "in_progress",
          startDate: oneMonthAgo,
          dueDate: nextMonth,
        },
        {
          clientId: pinnacle.id,
          name: "HiBob Onboarding Workflow Setup",
          description:
            "Design and implement automated onboarding workflows including document collection, equipment provisioning, and IT access requests.",
          status: "review",
          startDate: oneMonthAgo,
          dueDate: nextMonth,
        },
        {
          clientId: atlas.id,
          name: "HiBob → Greenhouse ATS Sync",
          description:
            "Seamless integration between Greenhouse ATS and HiBob for new hire data transfer and recruitment analytics.",
          status: "completed",
          startDate: twoMonthsAgo,
          dueDate: oneMonthAgo,
        },
        {
          clientId: horizon.id,
          name: "HiBob Data Migration from BambooHR",
          description:
            "Full employee data migration from BambooHR including historical records, documents, and time-off balances.",
          status: "on_hold",
          startDate: twoMonthsAgo,
          dueDate: twoWeeksAgo, // Overdue by 2 weeks
        },
      ])
      .returning();

    console.log("✓ Created 4 projects (including 1 overdue edge case)");

    // Create client activity records
    await db.insert(clientActivity).values([
      {
        clientId: meridian.id,
        lastLogin: oneDayAgo,
        lastMessageSent: twoDaysAgo,
        lastFileDownloaded: fiveDaysAgo,
      },
      {
        clientId: pinnacle.id,
        lastLogin: oneDayAgo,
        lastMessageSent: twoDaysAgo,
        lastFileDownloaded: twoDaysAgo,
      },
      {
        clientId: atlas.id,
        lastLogin: oneMonthAgo,
        lastMessageSent: oneMonthAgo,
        lastFileDownloaded: twoMonthsAgo,
      },
      {
        clientId: horizon.id,
        lastLogin: threeWeeksAgo,
        lastMessageSent: null, // Never sent a message
        lastFileDownloaded: null, // Never downloaded a file
      },
    ]);

    console.log("✓ Created client activity records");

    // Create realistic messages between DD consultants and clients
    await db.insert(messages).values([
      // Project 1: HiBob → ADP Payroll Integration (Meridian)
      {
        projectId: project1.id,
        userId: adminUser.id,
        content:
          "Hi Jennifer! We've completed the initial mapping between HiBob and ADP. The test payroll file ran successfully with all 247 employees. Ready to schedule a call to review the validation report?",
        read: true,
        createdAt: fiveDaysAgo,
      },
      {
        projectId: project1.id,
        userId: meridianUser.id,
        content:
          "That's great news! I reviewed the report - everything looks accurate. Can we meet Thursday at 2pm to discuss the go-live plan?",
        read: true,
        createdAt: twoDaysAgo,
      },
      {
        projectId: project1.id,
        userId: adminUser.id,
        content:
          "Thursday at 2pm works perfectly. I'll send a calendar invite with the agenda. We'll cover the cutover timeline and rollback procedures.",
        read: false,
        createdAt: oneDayAgo,
      },

      // Project 2: HiBob Onboarding Workflow (Pinnacle)
      {
        projectId: project2.id,
        userId: adminUser.id,
        content:
          "Robert, the onboarding workflow is now live in your sandbox environment. I've created 2 test employees so you can walk through the full process. Let me know when you're ready for a demo!",
        read: true,
        createdAt: fiveDaysAgo,
      },
      {
        projectId: project2.id,
        userId: pinnacleUser.id,
        content:
          "I walked through both test cases - this is exactly what we need! The document e-signatures and equipment request integrations are working perfectly. When can we move this to production?",
        read: true,
        createdAt: twoDaysAgo,
      },

      // Project 3: HiBob → Greenhouse ATS Sync (Atlas) - Completed
      {
        projectId: project3.id,
        userId: adminUser.id,
        content:
          "Sarah, I'm pleased to confirm the Greenhouse integration is complete! All new hires from your ATS will automatically sync to HiBob within 15 minutes. I've attached the final integration documentation.",
        read: true,
        createdAt: oneMonthAgo,
      },
      {
        projectId: project3.id,
        userId: atlasUser.id,
        content:
          "Fantastic work! Our recruiting team is already seeing the time savings. Thank you for the excellent support throughout this project.",
        read: true,
        createdAt: oneMonthAgo,
      },
    ]);

    console.log("✓ Created realistic consultant messages");

    console.log("");
    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("Demo data created:");
    console.log("  - 1 agency (Digital Directions)");
    console.log("  - 4 clients (Meridian Healthcare, Pinnacle Financial, Atlas Manufacturing, Horizon Tech)");
    console.log("  - 4 users (1 admin, 3 client users)");
    console.log("  - 4 HiBob integration projects (various statuses, including 1 overdue)");
    console.log("  - 7 realistic consultant-client messages");
    console.log("  - 4 client activity records");
    console.log("");
    console.log("Note: Horizon Tech is an edge case client with:");
    console.log("  - Archived status");
    console.log("  - Overdue project (2 weeks)");
    console.log("  - Stalled communication (3 weeks)");
    console.log("  - No file downloads or messages sent");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
