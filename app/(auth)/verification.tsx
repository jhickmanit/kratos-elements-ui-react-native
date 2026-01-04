import React from "react";
import { Alert } from "react-native";
import { VerificationFlow, UpdateVerificationFlowBody, UiText } from "@ory/client-fetch";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { useOryFlow } from "../../hooks/useOryFlow";

export default function VerificationScreen() {
  const { flow, isSubmitting, submit } =
    useOryFlow<VerificationFlow>("verification");

  const onSubmit = async (values: UpdateVerificationFlowBody) => {
    const response = await submit(values);

    if (response?.ui?.messages?.some((m: UiText) => m.type === "success" || m.type === "info")) {
      Alert.alert("Success", "Verification email sent! Check your inbox.");
    }
  };

  return (
    <AuthCard title="Verify Email" subtitle="Enter your verification code.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
