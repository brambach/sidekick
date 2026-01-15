/**
 * KeyPay Health Check
 * Tests connectivity to KeyPay API by calling a lightweight endpoint
 */

interface HealthCheckResult {
  status: "healthy" | "degraded" | "down" | "unknown";
  responseTimeMs: number | null;
  errorMessage: string | null;
}

export async function checkKeyPayHealth(
  apiEndpoint: string,
  credentials: any
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // KeyPay API requires API key in headers
    const apiKey = credentials?.apiKey || credentials?.key;

    if (!apiKey) {
      return {
        status: "unknown",
        responseTimeMs: null,
        errorMessage: "Missing API key in credentials",
      };
    }

    // Call KeyPay business info endpoint (lightweight check)
    // KeyPay has different regions (AU, NZ, UK, etc.)
    // Default endpoint if not provided
    const endpoint =
      apiEndpoint || "https://api.keypay.com.au/api/v2/business";

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Api-Key": apiKey,
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
        errorMessage: "Authentication failed - invalid or expired API key",
      };
    }

    if (response.status >= 500) {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: `KeyPay API server error (${response.status})`,
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
        errorMessage: "Request timeout - KeyPay API not responding",
      };
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        status: "down",
        responseTimeMs: responseTime,
        errorMessage: "Cannot connect to KeyPay API - DNS or network error",
      };
    }

    return {
      status: "down",
      responseTimeMs: responseTime,
      errorMessage: error.message || "Unknown error occurred",
    };
  }
}
