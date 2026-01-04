import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { ory } from "../../api/ory";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { VerificationFlow, UpdateVerificationFlowBody } from "@ory/client-fetch";
import { isWeb } from "../../api/platform";
import { extractFlowFromError, isCsrfError } from "../../api/errors";

export default function VerificationScreen() {
  const [flow, setFlow] = useState<VerificationFlow | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initialize Verification Flow based on platform
    const createFlow = isWeb
      ? ory.createBrowserVerificationFlow()
      : ory.createNativeVerificationFlow();

    createFlow
      .then((flow) => {
        setFlow(flow);
      })
      .catch((err) => {
        console.error("Failed to create verification flow:", err);
        Alert.alert("Error", "Could not create verification flow");
      });
  }, []);

  const onSubmit = async (values: UpdateVerificationFlowBody) => {
    if (!flow || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await ory.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: values,
      });

      // Verification flow typically returns updated flow with success/error messages
      if ("ui" in response) {
        setFlow(response as VerificationFlow);
        // Check for success state
        const hasSuccess = response.ui?.messages?.some(
          (m) => m.type === "success" || m.type === "info"
        );
        if (hasSuccess) {
          Alert.alert("Success", "Verification email sent! Check your inbox.");
        }
      }
    } catch (err: unknown) {
      console.error("Verification error:", err);

      // Handle CSRF errors by recreating the flow
      if (await isCsrfError(err)) {
        console.log("CSRF error detected, recreating flow...");
        try {
          const createFlow = isWeb
            ? ory.createBrowserVerificationFlow()
            : ory.createNativeVerificationFlow();
          const newFlow = await createFlow;
          setFlow(newFlow);
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please try again."
          );
        } catch (flowErr) {
          console.error("Failed to recreate verification flow:", flowErr);
          Alert.alert("Error", "Could not refresh verification. Please reload the page.");
        }
        setIsSubmitting(false);
        return;
      }

      const errorFlow = await extractFlowFromError(err);
      if (errorFlow?.ui) {
        setFlow(errorFlow as VerificationFlow);
      } else {
        Alert.alert("Error", "Verification failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Verify Email" subtitle="Enter your verification code.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
