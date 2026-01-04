import * as SecureStore from "expo-secure-store";
import { isWeb } from "./platform";

const SESSION_TOKEN_KEY = "ory_session_token";

/**
 * Session token storage abstraction.
 *
 * Native (iOS/Android): Uses expo-secure-store for encrypted storage
 * Web: No-op (relies on browser cookies for session management)
 */

export async function getSessionToken(): Promise<string | null> {
  if (isWeb) {
    // Web uses cookies, no manual token storage
    return null;
  }

  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get session token:", error);
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  if (isWeb) {
    // Web uses cookies, no manual token storage
    return;
  }

  try {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to set session token:", error);
    throw error;
  }
}

export async function clearSessionToken(): Promise<void> {
  if (isWeb) {
    // Web uses cookies, no manual token storage
    return;
  }

  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear session token:", error);
  }
}
