import { Platform } from "react-native";
import { isWeb, isNative } from "./platform";
import { oryUrl } from "./ory";

/**
 * Passkey (WebAuthn) utilities for Ory Kratos authentication flows.
 *
 * This module provides platform-aware passkey support:
 * - Web: Uses @simplewebauthn/browser
 * - Native (iOS/Android): Uses expo-passkey native module
 *
 * Kratos provides WebAuthn options in flow nodes:
 * - Registration: passkey_create_data contains PublicKeyCredentialCreationOptions
 * - Login: passkey_challenge contains the challenge string
 */

/**
 * Extract the Relying Party ID from the Ory URL
 * For localhost development, this returns "localhost"
 * For production, this returns the domain (e.g., "your-project.projects.oryapis.com")
 */
export function getRelyingPartyId(): string {
  try {
    const url = new URL(oryUrl);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

/**
 * Parse the passkey_create_data value from Kratos registration flow.
 *
 * Kratos returns this structure:
 * {
 *   "credentialOptions": {
 *     "publicKey": {
 *       "challenge": "...",
 *       "rp": { "name": "...", "id": "..." },
 *       "user": { "name": "...", "displayName": "...", "id": "..." },
 *       "pubKeyCredParams": [...],
 *       "authenticatorSelection": {...},
 *       ...
 *     }
 *   }
 * }
 */
export interface ParsedRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: "public-key";
    alg: number;
  }>;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  excludeCredentials?: Array<{
    type: "public-key";
    id: string;
    transports?: AuthenticatorTransport[];
  }>;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

export function parseRegistrationOptions(passkeyCreateData: string): ParsedRegistrationOptions {
  try {
    const data = JSON.parse(passkeyCreateData);
    const publicKey = data.credentialOptions?.publicKey || data.publicKey || data;

    return {
      challenge: publicKey.challenge,
      rp: publicKey.rp,
      user: publicKey.user,
      pubKeyCredParams: publicKey.pubKeyCredParams,
      timeout: publicKey.timeout,
      attestation: publicKey.attestation,
      excludeCredentials: publicKey.excludeCredentials,
      authenticatorSelection: publicKey.authenticatorSelection,
    };
  } catch (error) {
    throw new Error(`Failed to parse passkey registration options: ${error}`);
  }
}

/**
 * Parse the passkey_challenge value from Kratos login flow.
 *
 * Kratos returns this structure:
 * {
 *   "publicKey": {
 *     "challenge": "...",
 *     "timeout": 300000,
 *     "rpId": "localhost",
 *     "userVerification": "preferred",
 *     "allowCredentials": [...]
 *   }
 * }
 */
export interface ParsedLoginOptions {
  challenge: string;
  rpId: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: Array<{
    type: "public-key";
    id: string;
    transports?: AuthenticatorTransport[];
  }>;
}

export function parseLoginOptions(passkeyChallenge: string): ParsedLoginOptions {
  try {
    const data = JSON.parse(passkeyChallenge);
    const publicKey = data.publicKey || data;

    return {
      challenge: publicKey.challenge,
      rpId: publicKey.rpId || getRelyingPartyId(),
      timeout: publicKey.timeout || 60000,
      userVerification: publicKey.userVerification || "preferred",
      allowCredentials: publicKey.allowCredentials,
    };
  } catch (error) {
    // Fallback: treat as raw challenge string (shouldn't happen with Kratos)
    return {
      challenge: passkeyChallenge,
      rpId: getRelyingPartyId(),
      timeout: 60000,
      userVerification: "preferred",
    };
  }
}

/**
 * Check if passkey authentication is supported on the current device.
 *
 * Web: Checks for WebAuthn API availability
 * Native: Checks for platform authenticator availability via expo-passkey
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (isWeb) {
    // Check for WebAuthn API availability
    if (
      typeof window !== "undefined" &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      try {
        return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    }
    return false;
  }

  // For native, check via expo-passkey module
  try {
    // Use require for native module - dynamic import resolves to wrong entry point
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoPasskeyModule = require("expo-passkey/native").default;
    return ExpoPasskeyModule.isPasskeySupported();
  } catch {
    // Fallback to OS version check if module import fails
    if (Platform.OS === "ios") {
      const version = parseInt(Platform.Version as string, 10);
      return version >= 16;
    }
    if (Platform.OS === "android") {
      const version = Platform.Version as number;
      return version >= 28;
    }
    return false;
  }
}

/**
 * Perform passkey registration ceremony.
 *
 * This function handles the platform-specific WebAuthn registration:
 * - Web: Uses navigator.credentials.create() via @simplewebauthn/browser
 * - Native: Uses expo-passkey native module
 *
 * @param options - Parsed registration options from Kratos
 * @returns Formatted credential response string for Kratos submission
 */
export async function performRegistration(
  options: ParsedRegistrationOptions
): Promise<string> {
  if (isWeb) {
    return performWebRegistration(options);
  } else {
    return performNativeRegistration(options);
  }
}

async function performWebRegistration(
  options: ParsedRegistrationOptions
): Promise<string> {
  // Dynamic import to avoid bundling issues on native
  const { startRegistration } = await import("@simplewebauthn/browser");

  // Convert options to @simplewebauthn format
  const webAuthnOptions = {
    challenge: options.challenge,
    rp: options.rp,
    user: {
      id: options.user.id,
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout || 60000,
    attestation: options.attestation || "none",
    excludeCredentials: options.excludeCredentials?.map((cred) => ({
      id: cred.id,
      type: cred.type,
      transports: cred.transports,
    })),
    authenticatorSelection: options.authenticatorSelection,
  };

  const credential = await startRegistration({ optionsJSON: webAuthnOptions });

  // Format response for Kratos
  return JSON.stringify({
    id: credential.id,
    rawId: credential.rawId,
    type: credential.type,
    response: {
      clientDataJSON: credential.response.clientDataJSON,
      attestationObject: credential.response.attestationObject,
      transports: credential.response.transports,
    },
    clientExtensionResults: credential.clientExtensionResults || {},
  });
}

async function performNativeRegistration(
  options: ParsedRegistrationOptions
): Promise<string> {
  // Import the expo-passkey native module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExpoPasskeyModule = require("expo-passkey/native").default;

  // Format the request as JSON for the native module
  const requestJson = JSON.stringify({
    challenge: options.challenge,
    rp: options.rp,
    user: options.user,
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation,
    excludeCredentials: options.excludeCredentials,
    authenticatorSelection: options.authenticatorSelection,
  });

  // Call the native module - it returns a JSON string
  const credentialJson = await ExpoPasskeyModule.createPasskey({ requestJson });

  // The response is already formatted as JSON, return it directly
  return credentialJson;
}

/**
 * Perform passkey login (authentication) ceremony.
 *
 * This function handles the platform-specific WebAuthn authentication:
 * - Web: Uses navigator.credentials.get() via @simplewebauthn/browser
 * - Native: Uses expo-passkey native module
 *
 * @param options - Parsed login options from Kratos
 * @returns Formatted credential response string for Kratos submission
 */
export async function performLogin(options: ParsedLoginOptions): Promise<string> {
  if (isWeb) {
    return performWebLogin(options);
  } else {
    return performNativeLogin(options);
  }
}

async function performWebLogin(options: ParsedLoginOptions): Promise<string> {
  // Dynamic import to avoid bundling issues on native
  const { startAuthentication } = await import("@simplewebauthn/browser");

  // Convert options to @simplewebauthn format
  const webAuthnOptions = {
    challenge: options.challenge,
    rpId: options.rpId,
    timeout: options.timeout || 60000,
    userVerification: options.userVerification || "preferred",
    allowCredentials: options.allowCredentials?.map((cred) => ({
      id: cred.id,
      type: cred.type,
      transports: cred.transports,
    })),
  };

  const credential = await startAuthentication({ optionsJSON: webAuthnOptions });

  // Format response for Kratos
  return JSON.stringify({
    id: credential.id,
    rawId: credential.rawId,
    type: credential.type,
    response: {
      clientDataJSON: credential.response.clientDataJSON,
      authenticatorData: credential.response.authenticatorData,
      signature: credential.response.signature,
      userHandle: credential.response.userHandle,
    },
    clientExtensionResults: credential.clientExtensionResults || {},
  });
}

async function performNativeLogin(options: ParsedLoginOptions): Promise<string> {
  // Import the expo-passkey native module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExpoPasskeyModule = require("expo-passkey/native").default;

  // Format the request as JSON for the native module
  const requestJson = JSON.stringify({
    challenge: options.challenge,
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification,
    allowCredentials: options.allowCredentials,
  });

  // Call the native module - it returns a JSON string
  const credentialJson = await ExpoPasskeyModule.authenticateWithPasskey({ requestJson });

  // The response is already formatted as JSON, return it directly
  return credentialJson;
}

/**
 * Error types for passkey operations
 */
export enum PasskeyErrorType {
  NotSupported = "NotSupported",
  Cancelled = "Cancelled",
  InvalidState = "InvalidState",
  NotAllowed = "NotAllowed",
  SecurityError = "SecurityError",
  Unknown = "Unknown",
}

export interface PasskeyError {
  type: PasskeyErrorType;
  message: string;
  originalError?: unknown;
}

/**
 * Parse and categorize passkey errors for user-friendly display
 */
export function parsePasskeyError(error: unknown): PasskeyError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "";

  // WebAuthn error types
  if (errorName === "NotSupportedError" || errorMessage.includes("not supported")) {
    return {
      type: PasskeyErrorType.NotSupported,
      message: "Passkey authentication is not supported on this device.",
      originalError: error,
    };
  }

  if (
    errorName === "NotAllowedError" ||
    errorMessage.includes("not allowed") ||
    errorMessage.includes("cancelled") ||
    errorMessage.includes("canceled")
  ) {
    return {
      type: PasskeyErrorType.Cancelled,
      message: "Passkey authentication was cancelled.",
      originalError: error,
    };
  }

  if (errorName === "InvalidStateError" || errorMessage.includes("invalid state")) {
    return {
      type: PasskeyErrorType.InvalidState,
      message: "A passkey for this account already exists.",
      originalError: error,
    };
  }

  if (errorName === "SecurityError" || errorMessage.includes("security")) {
    return {
      type: PasskeyErrorType.SecurityError,
      message: "Security error during passkey authentication.",
      originalError: error,
    };
  }

  return {
    type: PasskeyErrorType.Unknown,
    message: errorMessage || "An unknown error occurred during passkey authentication.",
    originalError: error,
  };
}
