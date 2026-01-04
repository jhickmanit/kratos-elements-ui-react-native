import React from "react";
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from "react-native";
import { UiNode, UiNodeInputAttributes } from "@ory/client-fetch";

interface NodeInputProps {
  node: UiNode;
  attributes: UiNodeInputAttributes;
  value?: unknown;
  setValue: (value: string) => void;
  disabled: boolean;
  onSubmit?: (method: string, value?: string) => void;
  onEnterSubmit?: () => void;
}

type TextContentType = TextInputProps["textContentType"];
type AutoCompleteType = TextInputProps["autoComplete"];

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
  const name = attributes.name;
  const hasError = node.messages?.some((m) => m.type === "error");

  // Use controlled value from state, fallback to attribute value for initial render
  const inputValue =
    value !== undefined ? String(value) : String(attributes.value ?? "");

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
            onSubmit && onSubmit(name, attributes.value as string)
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

  // Detect field types based on type and name
  const isPassword = type === "password";
  const isEmail = type === "email" || name === "identifier" || name?.includes("email");
  const isCode = name === "code" || name?.includes("code") || name?.includes("totp");

  // Detect if this is a new password field (registration/settings) vs login password
  // Registration group or password_register name indicates new password
  const isNewPassword = isPassword && (
    node.group === "password" && name?.includes("password") && !name?.includes("current")
  );

  /**
   * Get iOS textContentType for password autofill support
   * See: https://developer.apple.com/documentation/uikit/uitextcontenttype
   */
  const getTextContentType = (): TextContentType => {
    if (isCode) return "oneTimeCode";
    if (isEmail) return "emailAddress";
    if (isNewPassword) return "newPassword";
    if (isPassword) return "password";
    if (name === "identifier") return "username";
    return "none";
  };

  /**
   * Get autoComplete value for cross-platform autofill
   */
  const getAutoComplete = (): AutoCompleteType => {
    if (isCode) return "one-time-code";
    if (isEmail) return "email";
    if (isNewPassword) return "password-new";
    if (isPassword) return "password";
    if (name === "identifier") return "username";
    return "off";
  };

  const handleChangeText = (text: string) => {
    setValue(text);
  };

  return (
    <View className="mb-4">
      <Text className="mb-1.5 font-medium text-sm text-ui-700">
        {node.meta.label?.text || name}
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
        placeholder={node.meta.label?.text || name}
        placeholderTextColor="#64748b"
        keyboardType={isEmail ? "email-address" : isCode ? "number-pad" : "default"}
        returnKeyType="done"
        onSubmitEditing={onEnterSubmit}
        blurOnSubmit={false}
      />
      {node.messages?.map((msg, index) => (
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
