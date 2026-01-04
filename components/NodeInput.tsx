import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { UiNode, UiNodeInputAttributes } from "@ory/client-fetch";

interface NodeInputProps {
  node: UiNode;
  attributes: UiNodeInputAttributes;
  value?: any;
  setValue: (value: any) => void;
  disabled: boolean;
  onSubmit?: (method: string, value?: string) => void;
  onEnterSubmit?: () => void;
}

export const NodeInput = ({
  node,
  attributes,
  value,
  setValue,
  disabled,
  onSubmit,
  onEnterSubmit,
}: NodeInputProps) => {
  const type = attributes.type;
  const hasError = node.messages?.some((m) => m.type === "error");

  // Use controlled value from state, fallback to attribute value for initial render
  const inputValue =
    value !== undefined ? value : (attributes.value as string) || "";

  if (type === "hidden") {
    return null;
  }

  if (type === "submit" || type === "button") {
    return (
      <View className="mb-4">
        <TouchableOpacity
          className={`relative flex justify-center items-center gap-3 overflow-hidden rounded-buttons p-4 max-w-[488px] ${
            disabled
              ? "bg-ui-200 cursor-not-allowed"
              : "bg-ui-900 active:bg-ui-700"
          }`}
          onPress={() =>
            onSubmit && onSubmit(attributes.name, attributes.value as string)
          }
          disabled={disabled}
        >
          <Text
            className={`font-medium leading-none ${
              disabled ? "text-ui-400" : "text-ui-50"
            }`}
          >
            {node.meta.label?.text || attributes.value || "Submit"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle various text inputs
  const isPassword = type === "password";
  const isEmail = type === "email" || attributes.name === "identifier" || attributes.name?.includes("email");

  // Determine textContentType and autoComplete based on field type
  const getTextContentType = (): "emailAddress" | "password" | "username" | "none" => {
    if (isEmail) return "emailAddress";
    if (isPassword) return "password";
    if (attributes.name === "identifier") return "username";
    return "none";
  };

  const getAutoComplete = (): "email" | "password" | "username" | "off" => {
    if (isEmail) return "email";
    if (isPassword) return "password";
    if (attributes.name === "identifier") return "username";
    return "off";
  };

  const handleChangeText = (text: string) => {
    setValue(text);
  };

  return (
    <View className="mb-4">
      <Text className="mb-1.5 font-medium text-sm text-ui-700">
        {node.meta.label?.text || attributes.name}
      </Text>
      <TextInput
        className={`w-full rounded-forms border px-4 py-[13px] text-base bg-white text-ui-900 ${
          hasError ? "border-ui-danger" : "border-ui-300"
        } ${disabled ? "bg-ui-200 text-ui-400" : ""}`}
        value={inputValue}
        onChangeText={handleChangeText}
        editable={!disabled}
        secureTextEntry={isPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={getAutoComplete()}
        textContentType={getTextContentType()}
        placeholder={node.meta.label?.text || attributes.name}
        placeholderTextColor="#64748b"
        keyboardType={isEmail ? "email-address" : "default"}
        returnKeyType="done"
        onSubmitEditing={onEnterSubmit}
        blurOnSubmit={false}
      />
      {node.messages?.map((msg, index) => (
        <Text
          key={index}
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
