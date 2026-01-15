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
  phaseTemplates,
  templatePhases,
  tickets,
  ticketComments,
  invites,
} from "./schema";

const db = drizzle(sql);

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log("Clearing existing data...");
    await db.delete(ticketComments);
    await db.delete(tickets);
    await db.delete(invites);
    await db.delete(messages);
    await db.delete(files);
    await db.delete(clientActivity);
    await db.delete(projects);
    await db.delete(users);
    await db.delete(clients);
    await db.delete(agencies);
    await db.delete(templatePhases);
    await db.delete(phaseTemplates);

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

    // Create default phase template
    const [template] = await db
      .insert(phaseTemplates)
      .values({
        name: "Standard HiBob Implementation",
        description: "Standard 6-phase HiBob implementation process",
        isDefault: true,
      })
      .returning();

    console.log(`✓ Created phase template: ${template.name}`);

    // Create template phases
    const phases = [
      { name: "Project Discovery & Provisioning", description: "Initial project setup and requirements gathering", orderIndex: 0, estimatedDays: 5, color: "#8B5CF6" },
      { name: "Integration Build", description: "Build and configure HiBob integrations", orderIndex: 1, estimatedDays: 10, color: "#8B5CF6" },
      { name: "Internal Testing", description: "Internal QA and testing of integrations", orderIndex: 2, estimatedDays: 5, color: "#8B5CF6" },
      { name: "UAT", description: "User Acceptance Testing with client", orderIndex: 3, estimatedDays: 7, color: "#8B5CF6" },
      { name: "Go Live Preparation", description: "Final preparations before production launch", orderIndex: 4, estimatedDays: 3, color: "#8B5CF6" },
      { name: "Go Live", description: "Production launch and monitoring", orderIndex: 5, estimatedDays: 1, color: "#8B5CF6" },
    ];

    for (const phase of phases) {
      await db.insert(templatePhases).values({
        templateId: template.id,
        ...phase,
      });
    }

    console.log(`✓ Created ${phases.length} template phases`);

    console.log("");
    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("Database initialized:");
    console.log("  - Digital Directions agency record created");
    console.log("  - Standard HiBob Implementation phase template created");
    console.log("  - Ready for real clients and projects");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Create your admin account via sign-up");
    console.log("  2. Use 'npm run make-admin <your-email>' to grant admin access");
    console.log("  3. Invite team members and clients through the portal");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
