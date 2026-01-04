import React from "react";
import { useRouter } from "expo-router";
import { LoginFlow, UpdateLoginFlowBody } from "@ory/client-fetch";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { useAuth } from "../../context/AuthContext";
import { useOryFlow } from "../../hooks/useOryFlow";

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { flow, isSubmitting, submit } = useOryFlow<LoginFlow>("login");

  const onSubmit = async (values: UpdateLoginFlowBody) => {
    const response = await submit(values);

    if (response?.session) {
      const token =
        "session_token" in response ? response.session_token : undefined;
      await setAuth(response.session, token);
      setTimeout(() => router.back(), 100);
    }
  };

  return (
    <AuthCard title="Sign In" subtitle="Welcome back! Please sign in to continue.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
