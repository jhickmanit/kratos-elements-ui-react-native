import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { SettingsFlow, UpdateSettingsFlowBody } from "@ory/client-fetch";
import { isWeb } from "../../api/platform";
import { useAuth } from "../../context/AuthContext";
import { extractFlowFromError, isAuthError, isCsrfError } from "../../api/errors";

export default function SettingsScreen() {
  const [flow, setFlow] = useState<SettingsFlow | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading, getAuthenticatedClient } = useAuth();

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      Alert.alert("Session Expired", "Please login again");
      router.replace("/(auth)/login");
      return;
    }

    // Use authenticated client for settings flow
    const client = getAuthenticatedClient();

    // Initialize Settings Flow based on platform
    const createFlow = isWeb
      ? client.createBrowserSettingsFlow()
      : client.createNativeSettingsFlow();

    createFlow
      .then((flow) => {
        setFlow(flow);
      })
      .catch((err) => {
        console.error("Failed to create settings flow:", err);
        if (isAuthError(err)) {
          Alert.alert("Session Expired", "Please login again");
          router.replace("/(auth)/login");
        } else {
          Alert.alert("Error", "Could not create settings flow");
        }
      });
  }, [isLoading, isAuthenticated, getAuthenticatedClient, router]);

  const onSubmit = async (values: UpdateSettingsFlowBody) => {
    if (!flow || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const client = getAuthenticatedClient();
      const response = await client.updateSettingsFlow({
        flow: flow.id,
        updateSettingsFlowBody: values,
      });

      // Settings updated
      if ("ui" in response) {
        setFlow(response as SettingsFlow);
      }
      Alert.alert("Success", "Settings updated successfully");
    } catch (err: unknown) {
      console.error("Settings error:", err);

      if (isAuthError(err)) {
        Alert.alert("Session Expired", "Please login again");
        router.replace("/(auth)/login");
        return;
      }

      // Handle CSRF errors by recreating the flow
      if (await isCsrfError(err)) {
        console.log("CSRF error detected, recreating flow...");
        try {
          const authClient = getAuthenticatedClient();
          const createFlow = isWeb
            ? authClient.createBrowserSettingsFlow()
            : authClient.createNativeSettingsFlow();
          const newFlow = await createFlow;
          setFlow(newFlow);
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please try again."
          );
        } catch (flowErr) {
          console.error("Failed to recreate settings flow:", flowErr);
          Alert.alert("Error", "Could not refresh settings. Please reload the page.");
        }
        setIsSubmitting(false);
        return;
      }

      const errorFlow = await extractFlowFromError(err);
      if (errorFlow?.ui) {
        setFlow(errorFlow as SettingsFlow);
      } else {
        Alert.alert("Error", "Settings update failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Settings" subtitle="Manage your account settings.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
