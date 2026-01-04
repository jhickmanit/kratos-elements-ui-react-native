import React from "react";
import { Alert } from "react-native";
import { RecoveryFlow, UpdateRecoveryFlowBody, UiText } from "@ory/client-fetch";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { useOryFlow } from "../../hooks/useOryFlow";

export default function RecoveryScreen() {
  const { flow, isSubmitting, submit } = useOryFlow<RecoveryFlow>("recovery");

  const onSubmit = async (values: UpdateRecoveryFlowBody) => {
    const response = await submit(values);

    if (response?.ui?.messages?.some((m: UiText) => m.type === "success" || m.type === "info")) {
      Alert.alert("Success", "Recovery email sent! Check your inbox.");
    }
  };

  return (
    <AuthCard title="Recover Account" subtitle="Enter your email to reset your password.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
