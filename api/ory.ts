import { Configuration, FrontendApi } from "@ory/client-fetch";
import Constants from "expo-constants";
import { isWeb } from "./platform";

/**
 * Ory Backend URL Configuration
 *
 * Configure via environment variable:
 *   EXPO_PUBLIC_ORY_PROJECT_URL=https://your-project.projects.oryapis.com
 *
 * Supports both:
 *   - Ory Network: https://your-project.projects.oryapis.com
 *   - Self-hosted Kratos: http://localhost:4433 (or your Kratos public API URL)
 *
 * For local development with emulators/devices, use your machine's IP:
 *   EXPO_PUBLIC_ORY_PROJECT_URL=http://192.168.1.100:4433
 *
 * See .env.example for configuration details.
 */
const configuredUrl =
  Constants.expoConfig?.extra?.oryBaseUrl ||
  process.env.EXPO_PUBLIC_ORY_PROJECT_URL ||
  "https://playground.projects.oryapis.com";

// For web, always use localhost to match cookie domain
// For native (iOS/Android), use the configured URL (which may be an IP address)
export const oryUrl = isWeb
  ? configuredUrl.replace(/192\.168\.\d+\.\d+/, "localhost")
  : configuredUrl;

/**
 * Create an Ory FrontendApi client with platform-appropriate configuration.
 *
 * Web: Uses credentials: 'include' for cookie-based auth
 * Native: Uses X-Session-Token header for token-based auth
 *
 * @param sessionToken - Session token for native authentication (optional)
 */
export function createOryClient(sessionToken?: string | null): FrontendApi {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  // For native platforms, include the session token header if available
  if (!isWeb && sessionToken) {
    headers["X-Session-Token"] = sessionToken;
  }

  return new FrontendApi(
    new Configuration({
      basePath: oryUrl,
      headers,
      // Web: include credentials (cookies) with requests
      // Native: omit credentials (use session token header instead)
      credentials: isWeb ? "include" : "omit",
    })
  );
}

// Default unauthenticated client for flow initialization
export const ory = createOryClient();
