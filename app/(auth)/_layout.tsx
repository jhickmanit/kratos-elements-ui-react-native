import { Stack, useRouter } from "expo-router";
import { TouchableOpacity, Text, View, Platform } from "react-native";

const isWeb = Platform.OS === "web";

export default function AuthLayout() {
  const router = useRouter();

  // Custom back button that navigates back to home
  const HeaderLeft = () => (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ paddingLeft: isWeb ? 0 : 8 }}
      >
        <Text style={{ fontSize: 17, color: "#007AFF" }}>
          {isWeb ? "← Home" : "‹ Home"}
        </Text>
      </TouchableOpacity>
      {isWeb && (
        <Text style={{ fontSize: 17, color: "#c7c7cc", paddingHorizontal: 12 }}>
          |
        </Text>
      )}
    </View>
  );

  return (
    <Stack
      screenOptions={{
        headerLeft: () => <HeaderLeft />,
        headerTitleStyle: isWeb ? { fontSize: 17 } : undefined,
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
