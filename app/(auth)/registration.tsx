import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { ory } from "../../api/ory";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client-fetch";
import { isWeb } from "../../api/platform";
import { useAuth } from "../../context/AuthContext";
import { extractFlowFromError, isCsrfError } from "../../api/errors";

export default function RegistrationScreen() {
  const [flow, setFlow] = useState<RegistrationFlow | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuth();

  useEffect(() => {
    // Initialize Registration Flow based on platform
    const createFlow = isWeb
      ? ory.createBrowserRegistrationFlow()
      : ory.createNativeRegistrationFlow();

    createFlow
      .then((flow) => {
        setFlow(flow);
      })
      .catch((err) => {
        console.error("Failed to create registration flow:", err);
        Alert.alert("Error", "Could not create registration flow");
      });
  }, []);

  const onSubmit = async (values: UpdateRegistrationFlowBody) => {
    if (!flow || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: values,
      });

      // Handle successful registration
      if ("session" in response && response.session) {
        // Store session in auth context
        // For native, session_token is returned; for web, cookies are set automatically
        const token = "session_token" in response ? response.session_token : undefined;
        await setAuth(response.session, token);
        // Navigate back to home (using back() for proper native navigation on iOS)
        setTimeout(() => router.back(), 100);
        return;
      }

      // If response has UI, it means we need to continue the flow (e.g., verification)
      if ("ui" in response) {
        setFlow(response as unknown as RegistrationFlow);
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);

      // Handle CSRF errors by recreating the flow
      if (await isCsrfError(err)) {
        console.log("CSRF error detected, recreating flow...");
        try {
          const createFlow = isWeb
            ? ory.createBrowserRegistrationFlow()
            : ory.createNativeRegistrationFlow();
          const newFlow = await createFlow;
          setFlow(newFlow);
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please try again."
          );
        } catch (flowErr) {
          console.error("Failed to recreate registration flow:", flowErr);
          Alert.alert("Error", "Could not refresh registration. Please reload the page.");
        }
        setIsSubmitting(false);
        return;
      }

      // Extract flow from error response (400/422 validation errors)
      const errorFlow = await extractFlowFromError(err);
      if (errorFlow?.ui) {
        setFlow(errorFlow as RegistrationFlow);
      } else {
        Alert.alert("Error", "Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Sign up to get started.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
