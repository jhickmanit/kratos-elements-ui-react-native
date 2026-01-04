import React from "react";
import { UiNode, UiNodeInputAttributes } from "@ory/client-fetch";
import { View, Text } from "react-native";
import { NodeInput } from "./NodeInput";

interface NodeDispatcherProps {
  node: UiNode;
  value?: any;
  setValue: (name: string, value: any) => void;
  disabled: boolean;
  onSubmit?: (method: string, value?: string) => void;
  onEnterSubmit?: () => void;
}

export const NodeDispatcher = ({ node, value, setValue, disabled, onSubmit, onEnterSubmit }: NodeDispatcherProps) => {
  if (node.type === "input") {
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

  if (node.type === "text") {
    // Basic text node
    return (
      <View style={{ marginBottom: 10 }}>
        <Text>{node.meta.label?.text}</Text>
      </View>
    );
  }
  
  if (node.type === "img") {
    // Image rendering (e.g. for QR codes in MFA)
    // Placeholder for now
    return <Text>[Image Node: {node.meta.label?.text}]</Text>;
  }

  // Fallback
  return null;
};
