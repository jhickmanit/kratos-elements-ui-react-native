import React, { useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { SettingsFlow, UpdateSettingsFlowBody } from "@ory/client-fetch";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { useAuth } from "../../context/AuthContext";
import { useOryFlow } from "../../hooks/useOryFlow";

export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, getAuthenticatedClient } = useAuth();

  const handleAuthError = useCallback(() => {
    Alert.alert("Session Expired", "Please login again");
    router.replace("/(auth)/login");
  }, [router]);

  // Get authenticated client, memoized to prevent unnecessary re-renders
  const client = useMemo(
    () => (isAuthenticated ? getAuthenticatedClient() : undefined),
    [isAuthenticated, getAuthenticatedClient]
  );

  const { flow, isSubmitting, submit } = useOryFlow<SettingsFlow>("settings", {
    client,
    onAuthError: handleAuthError,
    skip: isLoading || !isAuthenticated,
  });

  const onSubmit = async (values: UpdateSettingsFlowBody) => {
    const response = await submit(values);

    if (response) {
      Alert.alert("Success", "Settings updated successfully");
    }
  };

  return (
    <AuthCard title="Settings" subtitle="Manage your account settings.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
