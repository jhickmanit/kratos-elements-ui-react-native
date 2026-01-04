import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { ory } from "../../api/ory";
import { OryFlow } from "../../components/OryFlow";
import { AuthCard } from "../../components/AuthCard";
import { RecoveryFlow, UpdateRecoveryFlowBody } from "@ory/client-fetch";
import { isWeb } from "../../api/platform";
import { extractFlowFromError, isCsrfError } from "../../api/errors";

export default function RecoveryScreen() {
  const [flow, setFlow] = useState<RecoveryFlow | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initialize Recovery Flow based on platform
    const createFlow = isWeb
      ? ory.createBrowserRecoveryFlow()
      : ory.createNativeRecoveryFlow();

    createFlow
      .then((flow) => {
        setFlow(flow);
      })
      .catch((err) => {
        console.error("Failed to create recovery flow:", err);
        Alert.alert("Error", "Could not create recovery flow");
      });
  }, []);

  const onSubmit = async (values: UpdateRecoveryFlowBody) => {
    if (!flow || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await ory.updateRecoveryFlow({
        flow: flow.id,
        updateRecoveryFlowBody: values,
      });

      // Recovery flow typically returns updated flow with success/error messages
      if ("ui" in response) {
        setFlow(response as RecoveryFlow);
        // Check for success state
        const hasSuccess = response.ui?.messages?.some(
          (m) => m.type === "success" || m.type === "info"
        );
        if (hasSuccess) {
          Alert.alert("Success", "Recovery email sent! Check your inbox.");
        }
      }
    } catch (err: unknown) {
      console.error("Recovery error:", err);

      // Handle CSRF errors by recreating the flow
      if (await isCsrfError(err)) {
        console.log("CSRF error detected, recreating flow...");
        try {
          const createFlow = isWeb
            ? ory.createBrowserRecoveryFlow()
            : ory.createNativeRecoveryFlow();
          const newFlow = await createFlow;
          setFlow(newFlow);
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please try again."
          );
        } catch (flowErr) {
          console.error("Failed to recreate recovery flow:", flowErr);
          Alert.alert("Error", "Could not refresh recovery. Please reload the page.");
        }
        setIsSubmitting(false);
        return;
      }

      const errorFlow = await extractFlowFromError(err);
      if (errorFlow?.ui) {
        setFlow(errorFlow as RecoveryFlow);
      } else {
        Alert.alert("Error", "Recovery failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Recover Account" subtitle="Enter your email to reset your password.">
      <OryFlow flow={flow} onSubmit={onSubmit} isLoading={isSubmitting} />
    </AuthCard>
  );
}
