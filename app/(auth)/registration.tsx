import React from "react";
import { useRouter } from "expo-router";
import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client-fetch";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { useAuth } from "../../context/AuthContext";
import { useOryFlow } from "../../hooks/useOryFlow";

export default function RegistrationScreen() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { flow, isSubmitting, submit } =
    useOryFlow<RegistrationFlow>("registration");

  const onSubmit = async (values: UpdateRegistrationFlowBody) => {
    const response = await submit(values);

    if (response && "session" in response && response.session) {
      const token =
        "session_token" in response ? response.session_token : undefined;
      await setAuth(response.session, token);
      setTimeout(() => router.back(), 100);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Sign up to get started.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
