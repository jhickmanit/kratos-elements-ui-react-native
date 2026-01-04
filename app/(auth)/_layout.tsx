import { Stack, useRouter } from "expo-router";
import { TouchableOpacity, Text, Platform } from "react-native";

export default function AuthLayout() {
  const router = useRouter();

  // Custom back button that navigates back to home
  const HeaderLeft = () => (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ paddingLeft: Platform.OS === "web" ? 0 : 8 }}
    >
      <Text style={{ fontSize: 16, color: "#007AFF" }}>
        {Platform.OS === "web" ? "← Home" : "‹ Home"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerLeft: () => <HeaderLeft />,
      }}
    >
      <Stack.Screen name="login" options={{ title: "Sign In" }} />
      <Stack.Screen name="registration" options={{ title: "Create Account" }} />
      <Stack.Screen name="recovery" options={{ title: "Recover Account" }} />
      <Stack.Screen name="verification" options={{ title: "Verify Email" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
