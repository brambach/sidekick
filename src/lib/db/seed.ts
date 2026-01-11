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
        name: "Apex Design Studio",
        logoUrl: "https://picsum.photos/seed/apex/200/200",
        primaryColor: "#3B82F6",
        domain: "apexdesign.studio",
      })
      .returning();

    console.log(`✓ Created agency: ${agency.name}`);

    // Create clients
    const [techCorp, startupX, retailCo, designCo] = await db
      .insert(clients)
      .values([
        {
          agencyId: agency.id,
          companyName: "TechCorp Industries",
          contactName: "John Smith",
          contactEmail: "john@techcorp.com",
          status: "active",
        },
        {
          agencyId: agency.id,
          companyName: "StartupX",
          contactName: "Sarah Johnson",
          contactEmail: "sarah@startupx.io",
          status: "active",
        },
        {
          agencyId: agency.id,
          companyName: "RetailCo",
          contactName: "Mike Davis",
          contactEmail: "mike@retailco.com",
          status: "inactive",
        },
        {
          agencyId: agency.id,
          companyName: "DesignCo",
          contactName: "Lisa Brown",
          contactEmail: "lisa@designco.com",
          status: "archived",
        },
      ])
      .returning();

    console.log(
      `✓ Created clients: ${[techCorp, startupX, retailCo, designCo]
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
    const [techCorpUser, startupXUser, retailCoUser] = await db
      .insert(users)
      .values([
        {
          clerkId: "demo_techcorp_clerk_id",
          role: "client",
          clientId: techCorp.id,
        },
        {
          clerkId: "demo_startupx_clerk_id",
          role: "client",
          clientId: startupX.id,
        },
        {
          clerkId: "demo_retailco_clerk_id",
          role: "client",
          clientId: retailCo.id,
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
          clientId: techCorp.id,
          name: "Corporate Website Redesign",
          description:
            "Complete overhaul of the TechCorp corporate website with modern design and improved UX.",
          status: "in_progress",
          startDate: oneMonthAgo,
          dueDate: nextMonth,
        },
        {
          clientId: startupX.id,
          name: "Mobile App UI/UX",
          description:
            "Design and prototype for StartupX flagship mobile application.",
          status: "review",
          startDate: oneMonthAgo,
          dueDate: nextMonth,
        },
        {
          clientId: retailCo.id,
          name: "E-commerce Platform",
          description:
            "Full e-commerce solution with payment integration and inventory management.",
          status: "completed",
          startDate: twoMonthsAgo,
          dueDate: oneMonthAgo,
        },
        {
          clientId: designCo.id,
          name: "Brand Refresh",
          description:
            "Complete brand identity refresh including logo, colors, and guidelines.",
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
        clientId: techCorp.id,
        lastLogin: oneDayAgo,
        lastMessageSent: twoDaysAgo,
        lastFileDownloaded: fiveDaysAgo,
      },
      {
        clientId: startupX.id,
        lastLogin: oneDayAgo,
        lastMessageSent: twoDaysAgo,
        lastFileDownloaded: twoDaysAgo,
      },
      {
        clientId: retailCo.id,
        lastLogin: oneMonthAgo,
        lastMessageSent: oneMonthAgo,
        lastFileDownloaded: twoMonthsAgo,
      },
      {
        clientId: designCo.id,
        lastLogin: threeWeeksAgo,
        lastMessageSent: null, // Never sent a message
        lastFileDownloaded: null, // Never downloaded a file
      },
    ]);

    console.log("✓ Created client activity records");

    console.log("");
    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("Demo data created:");
    console.log("  - 1 agency (Apex Design Studio)");
    console.log("  - 4 clients (TechCorp, StartupX, RetailCo, DesignCo)");
    console.log("  - 4 users (1 admin, 3 client users)");
    console.log("  - 4 projects (various statuses, including 1 overdue)");
    console.log("  - 4 client activity records");
    console.log("");
    console.log("Note: DesignCo is an edge case client with:");
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
