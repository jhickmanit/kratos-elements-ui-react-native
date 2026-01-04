import { ResponseError } from "@ory/client-fetch";

/**
 * Extract flow data from an Ory SDK error response.
 *
 * When Kratos returns a 400/422 with validation errors, the response body
 * contains the updated flow with error messages. This helper extracts that data.
 */
export async function extractFlowFromError(error: unknown): Promise<any | null> {
  if (error instanceof ResponseError) {
    try {
      const body = await error.response.json();
      return body ?? null;
    } catch {
      // Failed to parse JSON
      return null;
    }
  }

  // For other error types, try common patterns
  if (error && typeof error === "object") {
    const err = error as any;
    // Axios-style error
    if (err.response?.data?.ui) {
      return err.response.data;
    }
  }

  return null;
}

/**
 * Check if error is a session/auth error (401/403)
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ResponseError) {
    return error.response.status === 401 || error.response.status === 403;
  }

  if (error && typeof error === "object") {
    const err = error as any;
    const status = err.response?.status || err.status;
    return status === 401 || status === 403;
  }

  return false;
}

/**
 * Check if error is a CSRF validation error.
 * These occur when the CSRF token in the request doesn't match the cookie.
 */
export async function isCsrfError(error: unknown): Promise<boolean> {
  if (error instanceof ResponseError && error.response.status === 403) {
    try {
      // Clone the response to avoid consuming it
      const body = await error.response.clone().json();
      return body?.error?.id === "security_csrf_violation";
    } catch {
      return false;
    }
  }
  return false;
}
