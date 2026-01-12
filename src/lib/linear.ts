import { LinearClient } from "@linear/sdk";
import { db } from "./db";
import { tickets } from "./db/schema";
import { eq } from "drizzle-orm";

// Initialize Linear client
const linear = process.env.LINEAR_API_KEY
  ? new LinearClient({ apiKey: process.env.LINEAR_API_KEY })
  : null;

const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID;

// Map our ticket priority to Linear priority (1 = Urgent, 2 = High, 3 = Normal, 4 = Low, 0 = No priority)
function mapPriorityToLinear(priority: string): number {
  switch (priority) {
    case "urgent":
      return 1;
    case "high":
      return 2;
    case "medium":
      return 3;
    case "low":
      return 4;
    default:
      return 0;
  }
}

// Map our ticket type to Linear labels
function mapTypeToLabel(type: string): string {
  switch (type) {
    case "bug_report":
      return "Bug";
    case "feature_request":
      return "Feature";
    case "project_issue":
      return "Project";
    case "general_support":
    default:
      return "Support";
  }
}

interface CreateLinearIssueParams {
  ticketId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  type: string;
  clientName: string;
  projectName?: string;
  portalUrl: string;
}

export async function createLinearIssue(params: CreateLinearIssueParams): Promise<{
  issueId: string;
  issueUrl: string;
} | null> {
  if (!linear || !LINEAR_TEAM_ID) {
    console.log("Linear not configured, skipping issue creation");
    return null;
  }

  try {
    // Build issue description with metadata
    const descriptionParts = [
      params.description,
      "",
      "---",
      `**Client:** ${params.clientName}`,
    ];

    if (params.projectName) {
      descriptionParts.push(`**Project:** ${params.projectName}`);
    }

    descriptionParts.push(`**Portal Link:** [View in DD Portal](${params.portalUrl})`);

    const issue = await linear.createIssue({
      teamId: LINEAR_TEAM_ID,
      title: `[${mapTypeToLabel(params.type)}] ${params.title}`,
      description: descriptionParts.join("\n"),
      priority: mapPriorityToLinear(params.priority),
    });

    if (!issue.success || !issue.issue) {
      console.error("Failed to create Linear issue");
      return null;
    }

    const createdIssue = await issue.issue;
    const issueId = createdIssue.id;
    const issueUrl = createdIssue.url;

    // Update our ticket with Linear issue info
    await db
      .update(tickets)
      .set({
        linearIssueId: issueId,
        linearIssueUrl: issueUrl,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, params.ticketId));

    console.log(`Created Linear issue ${issueId} for ticket ${params.ticketId}`);

    return { issueId, issueUrl };
  } catch (error) {
    console.error("Error creating Linear issue:", error);
    return null;
  }
}

export async function updateLinearIssueStatus(
  linearIssueId: string,
  status: string
): Promise<boolean> {
  if (!linear) {
    console.log("Linear not configured, skipping status update");
    return false;
  }

  try {
    // Get the team's workflow states
    const issue = await linear.issue(linearIssueId);
    const team = await issue.team;

    if (!team) {
      console.error("Could not get team for Linear issue");
      return false;
    }

    const states = await team.states();

    // Map our status to Linear state name
    let targetStateName: string;
    switch (status) {
      case "open":
        targetStateName = "Backlog";
        break;
      case "in_progress":
        targetStateName = "In Progress";
        break;
      case "waiting_on_client":
        targetStateName = "In Progress"; // Or a custom state if you have one
        break;
      case "resolved":
        targetStateName = "Done";
        break;
      case "closed":
        targetStateName = "Done";
        break;
      default:
        targetStateName = "Backlog";
    }

    // Find the matching state
    const targetState = states.nodes.find(
      (s) => s.name.toLowerCase() === targetStateName.toLowerCase()
    );

    if (!targetState) {
      console.log(`Could not find Linear state matching "${targetStateName}"`);
      return false;
    }

    // Update the issue
    await linear.updateIssue(linearIssueId, {
      stateId: targetState.id,
    });

    console.log(`Updated Linear issue ${linearIssueId} to state ${targetStateName}`);
    return true;
  } catch (error) {
    console.error("Error updating Linear issue status:", error);
    return false;
  }
}

export async function addLinearComment(
  linearIssueId: string,
  body: string
): Promise<boolean> {
  if (!linear) {
    console.log("Linear not configured, skipping comment");
    return false;
  }

  try {
    await linear.createComment({
      issueId: linearIssueId,
      body,
    });

    console.log(`Added comment to Linear issue ${linearIssueId}`);
    return true;
  } catch (error) {
    console.error("Error adding Linear comment:", error);
    return false;
  }
}

// Helper to create issue when ticket is created
export async function createLinearIssueForTicket(params: {
  ticketId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  type: string;
  clientName: string;
  projectName?: string;
}): Promise<{ issueId: string; issueUrl: string } | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return createLinearIssue({
    ...params,
    portalUrl: `${baseUrl}/dashboard/admin/tickets/${params.ticketId}`,
  });
}
