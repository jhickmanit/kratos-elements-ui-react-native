import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import {
  UiNode,
  UiNodeInputAttributes,
  LoginFlow,
  RegistrationFlow,
  VerificationFlow,
  RecoveryFlow,
  SettingsFlow,
} from "@ory/client-fetch";
import { NodeDispatcher } from "./NodeDispatcher";
import { unflattenObject } from "../api/utils";

/** Generate a stable key for a UI node */
function getNodeKey(node: UiNode, index: number): string {
  if (node.type === "input") {
    const attrs = node.attributes as UiNodeInputAttributes;
    // Combine group, type, and name for uniqueness (e.g., "password-submit-method")
    return `${node.group}-${attrs.type}-${attrs.name}`;
  }
  // For non-input nodes, use group + type + index
  return `${node.group}-${node.type}-${index}`;
}

type AnyFlow =
  | LoginFlow
  | RegistrationFlow
  | VerificationFlow
  | RecoveryFlow
  | SettingsFlow;

interface OryFlowProps {
  flow?: AnyFlow;
  onSubmit: (body: any) => void;
  isLoading?: boolean;
}

export const OryFlow = ({ flow, onSubmit, isLoading }: OryFlowProps) => {
  const [values, setValues] = React.useState<Record<string, any>>({});

  // Initialize values from flow nodes
  React.useEffect(() => {
    if (flow?.ui?.nodes) {
      const flowValues: Record<string, unknown> = {};
      const hiddenFieldNames: Set<string> = new Set();

      flow.ui.nodes.forEach((node) => {
        if (node.type === "input") {
          const attrs = node.attributes as UiNodeInputAttributes;
          if (attrs.value !== undefined) {
            flowValues[attrs.name] = attrs.value;
          }
          // Track hidden fields - these should always use flow values (e.g., csrf_token)
          if (attrs.type === "hidden") {
            hiddenFieldNames.add(attrs.name);
          }
        }
      });

      setValues((prev) => {
        // Start with flow values
        const merged = { ...flowValues };
        // Preserve user edits for non-hidden fields only
        for (const key in prev) {
          if (!hiddenFieldNames.has(key) && prev[key] !== undefined) {
            merged[key] = prev[key];
          }
        }
        return merged;
      });
    }
  }, [flow]);

  const handleSetValue = React.useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleNodeSubmit = React.useCallback(
    (method: string, value?: string) => {
      // When a submit button is pressed, we include its value in the payload
      // and submit the whole form (all collected values)

      // IMPORTANT: Always pull hidden field values (like csrf_token) directly from
      // the flow at submission time to ensure they're current and not stale from state
      const hiddenValues: Record<string, unknown> = {};
      if (flow?.ui?.nodes) {
        flow.ui.nodes.forEach((node) => {
          if (node.type === "input") {
            const attrs = node.attributes as UiNodeInputAttributes;
            if (attrs.type === "hidden" && attrs.value !== undefined) {
              hiddenValues[attrs.name] = attrs.value;
            }
          }
        });
      }

      // Merge: hidden values from flow, user-entered values from state, submit button
      const flatPayload = { ...hiddenValues, ...values, [method]: value };

      // Unflatten dot-notation keys (e.g., "traits.email") into nested objects
      // as expected by Kratos API
      const payload = unflattenObject(flatPayload);
      onSubmit(payload);
    },
    [flow, values, onSubmit]
  );

  // Find the default submit button for Enter key submission
  // Must be before the early return to maintain consistent hook order
  const defaultSubmit = React.useMemo(() => {
    if (!flow?.ui?.nodes) return null;
    for (const node of flow.ui.nodes) {
      if (node.type === "input") {
        const attrs = node.attributes as UiNodeInputAttributes;
        if (attrs.type === "submit" && node.group === "password") {
          return { name: attrs.name, value: attrs.value as string };
        }
      }
    }
    // Fallback to first submit button
    for (const node of flow.ui.nodes) {
      if (node.type === "input") {
        const attrs = node.attributes as UiNodeInputAttributes;
        if (attrs.type === "submit") {
          return { name: attrs.name, value: attrs.value as string };
        }
      }
    }
    return null;
  }, [flow]);

  const handleEnterSubmit = React.useCallback(() => {
    if (defaultSubmit && !isLoading) {
      handleNodeSubmit(defaultSubmit.name, defaultSubmit.value);
    }
  }, [defaultSubmit, isLoading, handleNodeSubmit]);

  if (!flow) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color="rgb(15, 23, 42)" />
      </View>
    );
  }

  return (
    <View className="w-full">
      {flow.ui.messages?.map((msg, i) => (
        <View
          key={i}
          className={`p-3 mb-4 rounded-forms border ${
            msg.type === "error"
              ? "bg-red-50 border-red-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <Text
            className={`text-sm leading-5 ${
              msg.type === "error" ? "text-red-700" : "text-blue-700"
            }`}
          >
            {msg.text}
          </Text>
        </View>
      ))}

      {flow.ui.nodes.map((node, index) => {
        const name =
          node.type === "input"
            ? (node.attributes as UiNodeInputAttributes).name
            : undefined;
        return (
          <NodeDispatcher
            key={getNodeKey(node, index)}
            node={node}
            value={name ? values[name] : undefined}
            setValue={handleSetValue}
            disabled={isLoading || false}
            onSubmit={handleNodeSubmit}
            onEnterSubmit={handleEnterSubmit}
          />
        );
      })}
    </View>
  );
};
