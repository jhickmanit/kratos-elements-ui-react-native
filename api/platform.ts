import { Platform } from "react-native";

/**
 * Platform detection utilities for Ory authentication flows.
 *
 * Web: Uses browser flows with cookie-based CSRF and session management
 * Native (iOS/Android): Uses native flows with session token authentication
 */

export const isWeb = Platform.OS === "web";
export const isNative = Platform.OS === "ios" || Platform.OS === "android";
export const platformOS = Platform.OS;
