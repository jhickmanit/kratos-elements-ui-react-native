import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import {
  LoginFlow,
  RegistrationFlow,
  RecoveryFlow,
  VerificationFlow,
  SettingsFlow,
  FrontendApi,
} from "@ory/client-fetch";
import { ory } from "../api/ory";
import { isWeb } from "../api/platform";
import { extractFlowFromError, isCsrfError, isAuthError } from "../api/errors";

type AnyFlow =
  | LoginFlow
  | RegistrationFlow
  | RecoveryFlow
  | VerificationFlow
  | SettingsFlow;

type FlowType = "login" | "registration" | "recovery" | "verification" | "settings";

interface UseOryFlowOptions {
  /** Optional authenticated client for protected flows (e.g., settings) */
  client?: FrontendApi;
  /** Callback when auth error occurs (401/403) */
  onAuthError?: () => void;
  /** Skip flow creation (useful for waiting on auth state) */
  skip?: boolean;
}

interface UseOryFlowResult<T extends AnyFlow> {
  flow: T | undefined;
  isSubmitting: boolean;
  /** Submit the flow. Returns the API response on success, null on error. */
  submit: (values: any) => Promise<any>;
}

/**
 * Creates the appropriate flow based on type and platform.
 */
function createFlow<T extends AnyFlow>(
  flowType: FlowType,
  client: FrontendApi
): Promise<T> {
  const creators: Record<FlowType, () => Promise<AnyFlow>> = {
    login: isWeb
      ? () => client.createBrowserLoginFlow()
      : () => client.createNativeLoginFlow(),
    registration: isWeb
      ? () => client.createBrowserRegistrationFlow()
      : () => client.createNativeRegistrationFlow(),
    recovery: isWeb
      ? () => client.createBrowserRecoveryFlow()
      : () => client.createNativeRecoveryFlow(),
    verification: isWeb
      ? () => client.createBrowserVerificationFlow()
      : () => client.createNativeVerificationFlow(),
    settings: isWeb
      ? () => client.createBrowserSettingsFlow()
      : () => client.createNativeSettingsFlow(),
  };

  return creators[flowType]() as Promise<T>;
}

/**
 * Updates an existing flow with submitted values.
 */
function updateFlow<T extends AnyFlow>(
  flowType: FlowType,
  flowId: string,
  values: any,
  client: FrontendApi
): Promise<any> {
  const updaters: Record<FlowType, () => Promise<any>> = {
    login: () =>
      client.updateLoginFlow({ flow: flowId, updateLoginFlowBody: values }),
    registration: () =>
      client.updateRegistrationFlow({
        flow: flowId,
        updateRegistrationFlowBody: values,
      }),
    recovery: () =>
      client.updateRecoveryFlow({
        flow: flowId,
        updateRecoveryFlowBody: values,
      }),
    verification: () =>
      client.updateVerificationFlow({
        flow: flowId,
        updateVerificationFlowBody: values,
      }),
    settings: () =>
      client.updateSettingsFlow({
        flow: flowId,
        updateSettingsFlowBody: values,
      }),
  };

  return updaters[flowType]();
}

/**
 * Custom hook for managing Ory self-service flows.
 *
 * Handles:
 * - Flow creation (browser vs native based on platform)
 * - Flow submission with loading state
 * - CSRF error recovery (auto-recreates flow)
 * - Validation error extraction
 *
 * @param flowType - The type of flow to manage
 * @param options - Optional configuration
 */
export function useOryFlow<T extends AnyFlow>(
  flowType: FlowType,
  options: UseOryFlowOptions = {}
): UseOryFlowResult<T> {
  const { client = ory, onAuthError, skip = false } = options;

  const [flow, setFlow] = useState<T | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize flow on mount (unless skipped)
  useEffect(() => {
    if (skip) return;

    createFlow<T>(flowType, client)
      .then(setFlow)
      .catch((err) => {
        console.error(`Failed to create ${flowType} flow:`, err);

        if (isAuthError(err) && onAuthError) {
          onAuthError();
          return;
        }

        Alert.alert("Error", `Could not create ${flowType} flow`);
      });
  }, [flowType, client, onAuthError, skip]);

  const submit = useCallback(
    async (values: any): Promise<any> => {
      if (!flow || isSubmitting) return null;

      setIsSubmitting(true);
      try {
        const response = await updateFlow(flowType, flow.id, values, client);

        // Update flow state with response (may contain new UI state)
        if ("ui" in response) {
          setFlow(response as T);
        }

        return response;
      } catch (err: unknown) {
        console.error(`${flowType} error:`, err);

        // Handle auth errors
        if (isAuthError(err) && onAuthError) {
          onAuthError();
          return null;
        }

        // Handle CSRF errors by recreating the flow
        if (await isCsrfError(err)) {
          console.log("CSRF error detected, recreating flow...");
          try {
            const newFlow = await createFlow<T>(flowType, client);
            setFlow(newFlow);
            Alert.alert(
              "Session Expired",
              "Your session has expired. Please try again."
            );
          } catch (flowErr) {
            console.error(`Failed to recreate ${flowType} flow:`, flowErr);
            Alert.alert(
              "Error",
              `Could not refresh ${flowType}. Please reload the page.`
            );
          }
          return null;
        }

        // Extract flow from validation error response
        const errorFlow = await extractFlowFromError(err);
        if (errorFlow?.ui) {
          setFlow(errorFlow as T);
          return errorFlow as T;
        }

        Alert.alert("Error", `${flowType} failed. Please try again.`);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [flow, isSubmitting, flowType, client, onAuthError]
  );

  return { flow, isSubmitting, submit };
}
