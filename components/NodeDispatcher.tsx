import React from "react";
import {
  UiNode,
  UiNodeInputAttributes,
  UiNodeImageAttributes,
  UiNodeTextAttributes,
  UiNodeAnchorAttributes,
} from "@ory/client-fetch";
import { View, Text, Image, TouchableOpacity, Linking } from "react-native";
import { NodeInput } from "./NodeInput";

interface NodeDispatcherProps {
  node: UiNode;
  value?: unknown;
  setValue: (name: string, value: unknown) => void;
  disabled: boolean;
  onSubmit?: (method: string, value?: string) => void;
  onEnterSubmit?: () => void;
}

export const NodeDispatcher = ({
  node,
  value,
  setValue,
  disabled,
  onSubmit,
  onEnterSubmit,
}: NodeDispatcherProps) => {
  switch (node.type) {
    case "input": {
      const attributes = node.attributes as UiNodeInputAttributes;
      return (
        <NodeInput
          node={node}
          attributes={attributes}
          value={value}
          setValue={(val) => setValue(attributes.name, val)}
          disabled={disabled}
          onSubmit={onSubmit}
          onEnterSubmit={onEnterSubmit}
        />
      );
    }

    case "text": {
      const attributes = node.attributes as UiNodeTextAttributes;
      return (
        <View className="mb-4">
          {node.meta.label?.text && (
            <Text className="text-sm font-medium text-ui-700 mb-1">
              {node.meta.label.text}
            </Text>
          )}
          <Text className="text-sm text-ui-600">
            {attributes.text?.text || ""}
          </Text>
        </View>
      );
    }

    case "img": {
      const attributes = node.attributes as UiNodeImageAttributes;
      return (
        <View className="mb-4 items-center">
          {node.meta.label?.text && (
            <Text className="text-sm font-medium text-ui-700 mb-2">
              {node.meta.label.text}
            </Text>
          )}
          <Image
            source={{ uri: attributes.src }}
            style={{ width: attributes.width || 200, height: attributes.height || 200 }}
            resizeMode="contain"
            accessibilityLabel={node.meta.label?.text}
          />
        </View>
      );
    }

    case "a": {
      const attributes = node.attributes as UiNodeAnchorAttributes;
      return (
        <View className="mb-4">
          <TouchableOpacity
            onPress={() => Linking.openURL(attributes.href)}
            disabled={disabled}
          >
            <Text className="text-sm text-blue-600 underline">
              {attributes.title?.text || node.meta.label?.text || attributes.href}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    case "script":
      // Script nodes are typically for social login SDKs
      // They're handled by the browser on web, not applicable for native
      return null;

    default:
      // Unknown node type - log for debugging but don't break the UI
      if (__DEV__) {
        console.warn(`Unknown node type: ${node.type}`, node);
      }
      return null;
  }
};
