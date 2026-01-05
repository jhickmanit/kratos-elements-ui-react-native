import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { UiNode, UiNodeInputAttributes } from "@ory/client-fetch";
import {
  isPasskeySupported,
  parseRegistrationOptions,
  parseLoginOptions,
  performRegistration,
  performLogin,
  parsePasskeyError,
  PasskeyErrorType,
} from "../api/passkey";

interface NodePasskeyProps {
  nodes: UiNode[];
  onSubmit: (values: Record<string, string>) => void;
  disabled: boolean;
}

interface PasskeyInfo {
  id: string;
  displayName: string;
  addedAt: string;
  node: UiNode;
}

/**
 * NodePasskey handles the passkey group nodes from Ory Kratos.
 *
 * Registration flow nodes:
 * - passkey_create_data (hidden): Contains WebAuthn PublicKeyCredentialCreationOptions
 * - passkey_register_trigger (button): "Sign up with passkey" button
 * - passkey_register (hidden): Where the attestation response goes
 *
 * Login flow nodes:
 * - passkey_login_trigger (button): "Sign in with passkey" button
 * - passkey_login (hidden): Where the assertion response goes
 * - passkey_challenge (hidden): The challenge for authentication
 *
 * Settings flow nodes:
 * - passkey_remove (submit): Remove existing passkey button(s) - one per registered passkey
 * - passkey_register_trigger (button): "Add passkey" button
 * - passkey_settings_register (hidden): Where the attestation response goes
 * - passkey_create_data (hidden): Contains WebAuthn PublicKeyCredentialCreationOptions
 */
export const NodePasskey = ({ nodes, onSubmit, disabled }: NodePasskeyProps) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [removingPasskeyId, setRemovingPasskeyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isSupported, setIsSupported] = React.useState<boolean | null>(null);

  // Check passkey support on mount
  React.useEffect(() => {
    isPasskeySupported().then(setIsSupported);
  }, []);

  // Extract relevant node data
  const nodeData = React.useMemo(() => {
    let createData: string | null = null;
    let challenge: string | null = null;
    let registerTrigger: UiNode | null = null;
    let loginTrigger: UiNode | null = null;
    let isSettingsFlow = false;
    const existingPasskeys: PasskeyInfo[] = [];

    for (const node of nodes) {
      if (node.type !== "input") continue;
      const attrs = node.attributes as UiNodeInputAttributes;

      switch (attrs.name) {
        case "passkey_create_data":
          createData = attrs.value as string;
          break;
        case "passkey_challenge":
          challenge = attrs.value as string;
          break;
        case "passkey_register_trigger":
          registerTrigger = node;
          break;
        case "passkey_login_trigger":
          loginTrigger = node;
          break;
        case "passkey_settings_register":
          // This indicates we're in a settings flow
          isSettingsFlow = true;
          break;
        case "passkey_remove":
          // Extract passkey info from the node's meta label context
          const context = node.meta?.label?.context as {
            display_name?: string;
            added_at?: string;
          } | undefined;
          existingPasskeys.push({
            id: attrs.value as string,
            displayName: context?.display_name || "Unknown passkey",
            addedAt: context?.added_at || "",
            node,
          });
          break;
      }
    }

    const isRegistration = createData !== null && registerTrigger !== null && !isSettingsFlow;
    const isLogin = challenge !== null && loginTrigger !== null;

    return {
      createData,
      challenge,
      registerTrigger,
      loginTrigger,
      isRegistration,
      isLogin,
      isSettingsFlow,
      existingPasskeys,
      triggerNode: registerTrigger || loginTrigger,
    };
  }, [nodes]);

  const handlePasskeyPress = React.useCallback(async () => {
    setError(null);
    setIsProcessing(true);

    try {
      if (nodeData.createData) {
        // Registration or Settings flow - both use passkey_create_data
        const options = parseRegistrationOptions(nodeData.createData);
        const credentialResponse = await performRegistration(options);

        if (nodeData.isSettingsFlow) {
          // Settings flow uses passkey_settings_register
          onSubmit({
            passkey_settings_register: credentialResponse,
            method: "passkey",
          });
        } else {
          // Registration flow uses passkey_register
          onSubmit({
            passkey_register: credentialResponse,
            method: "passkey",
          });
        }
      } else if (nodeData.isLogin && nodeData.challenge) {
        // Login flow
        const options = parseLoginOptions(nodeData.challenge);
        const credentialResponse = await performLogin(options);

        onSubmit({
          passkey_login: credentialResponse,
          method: "passkey",
        });
      }
    } catch (err) {
      const passkeyError = parsePasskeyError(err);

      // Don't show error for user cancellation
      if (passkeyError.type !== PasskeyErrorType.Cancelled) {
        setError(passkeyError.message);
      }

      if (__DEV__) {
        console.error("Passkey error:", err);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [nodeData, onSubmit]);

  const handleRemovePasskey = React.useCallback(
    (passkeyId: string) => {
      setRemovingPasskeyId(passkeyId);
      onSubmit({
        passkey_remove: passkeyId,
      });
    },
    [onSubmit]
  );

  // Format date for display
  const formatDate = (isoDate: string): string => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoDate;
    }
  };

  // Don't render if passkeys are not supported
  if (isSupported === false) {
    return null;
  }

  // Still checking support
  if (isSupported === null) {
    return null;
  }

  // Check if we have anything to render
  const hasContent =
    nodeData.triggerNode ||
    nodeData.existingPasskeys.length > 0;

  if (!hasContent) {
    return null;
  }

  const buttonLabel =
    nodeData.triggerNode?.meta.label?.text ||
    (nodeData.isSettingsFlow
      ? "Add passkey"
      : nodeData.isRegistration
        ? "Sign up with passkey"
        : "Sign in with passkey");

  const isDisabled = disabled || isProcessing;

  return (
    <View className="mb-4">
      {/* Existing passkeys list (settings flow only) */}
      {nodeData.existingPasskeys.length > 0 && (
        <View className="mb-4">
          <Text className="text-sm font-medium text-ui-700 mb-2">
            Registered Passkeys
          </Text>
          {nodeData.existingPasskeys.map((passkey) => {
            const attrs = passkey.node.attributes as UiNodeInputAttributes;
            const isNodeDisabled = attrs.disabled || disabled;
            const isRemoving = removingPasskeyId === passkey.id;

            return (
              <View
                key={passkey.id}
                className="flex-row items-center justify-between p-3 mb-2 bg-ui-50 rounded-forms border border-ui-200"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg">🔐</Text>
                    <Text className="font-medium text-ui-900">
                      {passkey.displayName}
                    </Text>
                  </View>
                  {passkey.addedAt && (
                    <Text className="text-xs text-ui-500 mt-1 ml-7">
                      Added {formatDate(passkey.addedAt)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  className={`px-3 py-2 rounded-buttons ${
                    isNodeDisabled
                      ? "bg-ui-200"
                      : "bg-ui-danger active:bg-red-700"
                  }`}
                  onPress={() => handleRemovePasskey(passkey.id)}
                  disabled={isNodeDisabled || isRemoving}
                >
                  {isRemoving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      className={`text-sm font-medium ${
                        isNodeDisabled ? "text-ui-400" : "text-white"
                      }`}
                    >
                      Remove
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
          {/* Show hint if remove buttons are disabled */}
          {nodeData.existingPasskeys.some(
            (p) => (p.node.attributes as UiNodeInputAttributes).disabled
          ) && (
            <Text className="text-xs text-ui-500 mt-1">
              Re-authenticate to remove passkeys
            </Text>
          )}
        </View>
      )}

      {/* Passkey trigger button (add/register/login) */}
      {nodeData.triggerNode && (
        <TouchableOpacity
          className={`relative flex justify-center items-center gap-3 overflow-hidden rounded-buttons p-4 max-w-[488px] border-2 ${
            isDisabled
              ? "bg-ui-100 border-ui-200 cursor-not-allowed"
              : "bg-white border-ui-900 active:bg-ui-100"
          }`}
          onPress={handlePasskeyPress}
          disabled={isDisabled}
        >
          {isProcessing ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="rgb(15, 23, 42)" />
              <Text className="font-medium text-ui-900">
                {nodeData.isSettingsFlow
                  ? "Adding passkey..."
                  : nodeData.isRegistration
                    ? "Creating passkey..."
                    : "Authenticating..."}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-lg">🔐</Text>
              <Text
                className={`font-medium leading-none ${
                  isDisabled ? "text-ui-400" : "text-ui-900"
                }`}
              >
                {buttonLabel}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Error message */}
      {error && (
        <Text className="mt-2 text-sm text-ui-danger">{error}</Text>
      )}

      {/* Node-level messages from Kratos */}
      {nodeData.triggerNode?.messages?.map((msg, index) => (
        <Text
          key={msg.id ?? index}
          className={`mt-1.5 text-sm ${
            msg.type === "error" ? "text-ui-danger" : "text-ui-500"
          }`}
        >
          {msg.text}
        </Text>
      ))}
    </View>
  );
};
