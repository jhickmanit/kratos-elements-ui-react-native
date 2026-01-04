import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { platformOS } from "../api/platform";
import { oryUrl } from "../api/ory";

const isWeb = Platform.OS === "web";

export default function Home() {
  const router = useRouter();
  const { session, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    return (
      <View
        className={`flex-1 justify-center items-center ${
          isWeb ? "bg-ui-50" : "bg-white"
        }`}
      >
        <ActivityIndicator size="large" color="#0f172a" />
        <Text className="mt-3 text-ui-500 text-sm">Checking session...</Text>
      </View>
    );
  }

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
                  ? "relative w-full grid grid-cols-1 gap-6 border border-ui-300 bg-white px-12 py-14 rounded-cards"
                  : "relative w-full grid grid-cols-1 gap-6 bg-white px-5 py-5"
              }
            >
              {/* Header */}
              <View className="flex flex-col gap-2 items-center">
                <Text className="text-2xl font-semibold text-ui-900 text-center">
                  Ory Elements
                </Text>
                <Text className="text-sm text-ui-500 text-center">
                  React Native Self-Service UI
                </Text>
              </View>

              {/* Meta info */}
              <View className="items-center">
                <Text className="text-xs text-ui-400 mb-1">
                  Platform: {platformOS}
                </Text>
                <Text
                  className="text-xs text-ui-500"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {oryUrl}
                </Text>
              </View>

              {/* Session info */}
              {isAuthenticated && session?.identity ? (
                <View className="bg-ui-50 p-4 rounded-forms border border-ui-200 items-center">
                  <Text className="text-sm font-semibold text-ui-success">
                    Welcome,{" "}
                    {session.identity.traits?.email || session.identity.id}
                  </Text>
                  <Text className="text-xs text-ui-400 mt-1">
                    Session ID: {session.id.substring(0, 8)}...
                  </Text>
                </View>
              ) : (
                <View className="bg-ui-50 p-4 rounded-forms border border-ui-200 items-center">
                  <Text className="text-sm text-ui-500">Not logged in</Text>
                </View>
              )}

              {/* Buttons */}
              <View className="gap-3 w-full">
                {isAuthenticated ? (
                  <>
                    <TouchableOpacity
                      className="relative flex justify-center items-center gap-3 overflow-hidden rounded-buttons p-4 bg-ui-900 active:bg-ui-700"
                      onPress={() => router.push("/(auth)/settings")}
                    >
                      <Text className="font-medium leading-none text-ui-50">
                        Settings
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="relative flex justify-center items-center gap-3 overflow-hidden rounded-buttons p-4 bg-ui-danger active:bg-red-700"
                      onPress={logout}
                    >
                      <Text className="font-medium leading-none text-white">
                        Logout
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      className="relative flex justify-center items-center gap-3 overflow-hidden rounded-buttons p-4 bg-ui-900 active:bg-ui-700"
                      onPress={() => router.push("/(auth)/login")}
                    >
                      <Text className="font-medium leading-none text-ui-50">
                        Sign In
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="relative flex justify-center items-center gap-3 overflow-hidden rounded-buttons p-4 bg-white border border-ui-300 active:bg-ui-50"
                      onPress={() => router.push("/(auth)/registration")}
                    >
                      <Text className="font-medium leading-none text-ui-900">
                        Create Account
                      </Text>
                    </TouchableOpacity>
                    <View className="flex-row justify-center gap-6 mt-2">
                      <TouchableOpacity
                        onPress={() => router.push("/(auth)/recovery")}
                      >
                        <Text className="text-sm text-ui-500">
                          Forgot password?
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push("/(auth)/verification")}
                      >
                        <Text className="text-sm text-ui-500">Verify email</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
