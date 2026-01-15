/**
 * Workato Health Check
 * Tests connectivity to Workato API and checks recipe statuses
 *
 * NOTE: Requires Workato API credentials from Digital Directions
 * This is a placeholder implementation pending API access
 */

interface HealthCheckResult {
  status: "healthy" | "degraded" | "down" | "unknown";
  responseTimeMs: number | null;
  errorMessage: string | null;
  recipeStatuses?: {
    recipeId: string;
    status: string;
    lastRunAt: string | null;
  }[];
}

export async function checkWorkatoHealth(
  apiEndpoint: string,
  credentials: any,
  recipeIds?: string[]
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Workato API requires API token
    const apiToken = credentials?.apiToken || credentials?.token;

    if (!apiToken) {
      return {
        status: "unknown",
        responseTimeMs: null,
        errorMessage: "Missing API token in credentials (Workato credentials pending)",
      };
    }

    // Workato Recipe Lifecycle Management API endpoint
    // Default endpoint if not provided
    const endpoint = apiEndpoint || "https://www.workato.com/api/recipes";

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-USER-TOKEN": apiToken,
        "X-USER-EMAIL": credentials?.email || "",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout (Workato can be slower)
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();

      // If specific recipe IDs provided, check their statuses
      let recipeStatuses: any[] = [];
      if (recipeIds && recipeIds.length > 0) {
        // Filter recipes by provided IDs
        const recipes = Array.isArray(data) ? data : data.items || [];
        recipeStatuses = recipes
          .filter((r: any) => recipeIds.includes(r.id.toString()))
          .map((r: any) => ({
            recipeId: r.id,
            status: r.running ? "running" : "stopped",
            lastRunAt: r.last_run_at || null,
          }));

        // Check if any recipes are stopped or errored
        const hasStoppedRecipes = recipeStatuses.some(
          (r) => r.status === "stopped"
        );

        if (hasStoppedRecipes) {
          return {
            status: "degraded",
            responseTimeMs: responseTime,
            errorMessage: "Some Workato recipes are stopped",
            recipeStatuses,
          };
        }
      }

      return {
        status: "healthy",
        responseTimeMs: responseTime,
        errorMessage: null,
        recipeStatuses: recipeStatuses.length > 0 ? recipeStatuses : undefined,
      };
    }

    // API returned an error
    if (response.status === 401 || response.status === 403) {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: "Authentication failed - invalid or expired Workato token",
      };
    }

    if (response.status >= 500) {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: `Workato API server error (${response.status})`,
      };
    }

    if (response.status === 429) {
      return {
        status: "degraded",
        responseTimeMs: responseTime,
        errorMessage: "Rate limit exceeded",
      };
    }

    return {
      status: "degraded",
      responseTimeMs: responseTime,
      errorMessage: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    // Network or timeout errors
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: "Request timeout - Workato API not responding",
      };
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: "Cannot connect to Workato API - DNS or network error",
      };
    }

    return {
      status: "down",
      responseTimeMs: responseTime,
      errorMessage: error.message || "Unknown error occurred",
    };
  }
}
