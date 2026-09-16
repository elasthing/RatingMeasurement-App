import { Text, View } from "react-native";

import { isClear, statusLabel } from "@/src/api";
import { fonts, radius, spacing, useTheme } from "@/src/theme";

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const { colors } = useTheme();
  const clear = isClear(status);
  const bg = clear ? colors.success : colors.error;
  const pad = size === "sm" ? { pv: spacing.xs, ph: spacing.sm, fs: 11 } : { pv: 6, ph: spacing.md, fs: 13 };
  return (
    <View
      testID={`status-badge-${clear ? "clear" : "tarnish"}`}
      style={{
        backgroundColor: bg,
        paddingVertical: pad.pv,
        paddingHorizontal: pad.ph,
        borderRadius: radius.sm,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontFamily: fonts.monoBold, fontSize: pad.fs, letterSpacing: 1 }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}
