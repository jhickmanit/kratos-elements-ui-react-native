import React from "react";
import { View, Text, ScrollView, Platform } from "react-native";

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const isWeb = Platform.OS === "web";

export const AuthCard = ({ children, title, subtitle }: AuthCardProps) => {
  return (
    <ScrollView
      className={isWeb ? "flex-1 bg-ui-50" : "flex-1 bg-white"}
      contentContainerClassName="flex-grow"
    >
      <View
        className={
          isWeb
            ? "flex-1 items-center justify-center p-5 min-h-full"
            : "flex-1 items-center pt-[60px] min-h-full"
        }
      >
        <View className={isWeb ? "ory-elements w-full max-w-[480px]" : "ory-elements w-full"}>
          <View className="flex w-full flex-1 items-center justify-center">
            <View
              className={
                isWeb
                  ? "relative w-full grid grid-cols-1 gap-8 border border-ui-300 bg-white px-12 py-14 rounded-cards"
                  : "relative w-full grid grid-cols-1 gap-8 bg-white px-5 py-5"
              }
            >
              {/* Header */}
              <View className="flex flex-col gap-8">
                <View className="flex flex-col gap-2">
                  <Text className="text-lg font-semibold text-ui-900 text-center">
                    {title}
                  </Text>
                  {subtitle && (
                    <Text className="text-base text-ui-700 text-center">
                      {subtitle}
                    </Text>
                  )}
                </View>
              </View>

              {/* Content */}
              <View className="w-full">{children}</View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
