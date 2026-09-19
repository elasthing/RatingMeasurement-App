import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { ToastProvider } from "@/src/components/Toast";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const { colors } = useTheme();
  useFonts({
    "BarlowCondensed-Bold": require("../assets/fonts/BarlowCondensed-Bold.ttf"),
    "BarlowCondensed-SemiBold": require("../assets/fonts/BarlowCondensed-SemiBold.ttf"),
    "JetBrainsMono-Regular": require("../assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
    "JetBrainsMono-Bold": require("../assets/fonts/JetBrainsMono-Bold.ttf"),
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <View style={{ flex: 1, backgroundColor: colors.surface }}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.surface },
                      animation: "fade",
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="kht" />
                    <Stack.Screen name="copper" />
                    <Stack.Screen name="dka" />
                    <Stack.Screen name="result/[id]" />
                    <Stack.Screen name="copper-result/[id]" />
                    <Stack.Screen name="dka-result/[id]" />
                    <Stack.Screen name="color-scale" />
                    <Stack.Screen name="copper-scale" />
                    <Stack.Screen name="dka-scale" />
                    <Stack.Screen name="settings" options={{ presentation: "modal" }} />
                  </Stack>
                </View>
              </ToastProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
