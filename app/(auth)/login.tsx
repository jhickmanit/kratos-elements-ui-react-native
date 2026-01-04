import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { ory } from "../../api/ory";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { LoginFlow, UpdateLoginFlowBody } from "@ory/client-fetch";
import { isWeb } from "../../api/platform";
import { useAuth } from "../../context/AuthContext";
import { extractFlowFromError, isCsrfError } from "../../api/errors";

export default function LoginScreen() {
  const [flow, setFlow] = useState<LoginFlow | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuth();

  useEffect(() => {
    // Initialize Login Flow based on platform
    const createFlow = isWeb
      ? ory.createBrowserLoginFlow()
      : ory.createNativeLoginFlow();

    createFlow
      .then((flow) => {
        setFlow(flow);
      })
      .catch((err) => {
        console.error("Failed to create login flow:", err);
        Alert.alert("Error", "Could not create login flow");
      });
  }, []);

  const onSubmit = async (values: UpdateLoginFlowBody) => {
    if (!flow || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await ory.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: values,
      });

      // Handle successful login
      if (response.session) {
        // Store session in auth context
        // For native, session_token is returned; for web, cookies are set automatically
        const token = "session_token" in response ? response.session_token : undefined;
        await setAuth(response.session, token);
        // Navigate back to home (using back() for proper native navigation on iOS)
        setTimeout(() => router.back(), 100);
        return;
      }

      // If response has UI, it means we need to re-render the flow (e.g., 2FA)
      if ("ui" in response) {
        setFlow(response as unknown as LoginFlow);
      }
    } catch (err: unknown) {
      console.error("Login error:", err);

      // Handle CSRF errors by recreating the flow
      if (await isCsrfError(err)) {
        console.log("CSRF error detected, recreating flow...");
        try {
          const createFlow = isWeb
            ? ory.createBrowserLoginFlow()
            : ory.createNativeLoginFlow();
          const newFlow = await createFlow;
          setFlow(newFlow);
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please try again."
          );
        } catch (flowErr) {
          console.error("Failed to recreate login flow:", flowErr);
          Alert.alert("Error", "Could not refresh login. Please reload the page.");
        }
        setIsSubmitting(false);
        return;
      }

      // Extract flow from error response (400/422 validation errors)
      const errorFlow = await extractFlowFromError(err);
      if (errorFlow?.ui) {
        setFlow(errorFlow as LoginFlow);
      } else {
        Alert.alert("Error", "Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Sign In" subtitle="Welcome back! Please sign in to continue.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
