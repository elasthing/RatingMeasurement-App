import { Tabs } from "expo-router";
import { ChartLineUp, ClockCounterClockwise, Gauge, PlusCircle } from "phosphor-react-native";
import { Platform } from "react-native";

import { fonts, useTheme } from "@/src/theme";

export default function CopperTabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandSecondary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.monoMedium, fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => <Gauge size={24} color={color} weight={focused ? "fill" : "regular"} />,
        }}
      />
      <Tabs.Screen
        name="new-test"
        options={{
          title: "New Test",
          tabBarIcon: ({ color, focused }) => (
            <PlusCircle size={26} color={color} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <ClockCounterClockwise size={24} color={color} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
      <Tabs.Screen
        name="trend"
        options={{
          title: "Trend",
          tabBarIcon: ({ color, focused }) => (
            <ChartLineUp size={24} color={color} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
    </Tabs>
  );
}
