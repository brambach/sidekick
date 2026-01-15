/**
 * HiBob Health Check
 * Tests connectivity to HiBob API by calling a lightweight endpoint
 */

interface HealthCheckResult {
  status: "healthy" | "degraded" | "down" | "unknown";
  responseTimeMs: number | null;
  errorMessage: string | null;
}

export async function checkHiBobHealth(
  apiEndpoint: string,
  credentials: any
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // HiBob API typically requires API token in headers
    const token = credentials?.apiToken || credentials?.token;

    if (!token) {
      return {
        status: "unknown",
        responseTimeMs: null,
        errorMessage: "Missing API token in credentials",
      };
    }

    // Call HiBob company info endpoint (lightweight check)
    // Default endpoint if not provided
    const endpoint = apiEndpoint || "https://api.hibob.com/v1/company";

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: "healthy",
        responseTimeMs: responseTime,
        errorMessage: null,
      };
    }

    // API returned an error
    if (response.status === 401 || response.status === 403) {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: "Authentication failed - invalid or expired token",
      };
    }

    if (response.status >= 500) {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: `HiBob API server error (${response.status})`,
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
        errorMessage: "Request timeout - HiBob API not responding",
      };
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: "Cannot connect to HiBob API - DNS or network error",
      };
    }

    return {
      status: "down",
      responseTimeMs: responseTime,
      errorMessage: error.message || "Unknown error occurred",
    };
  }
}
