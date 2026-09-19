import { Text, View } from "react-native";

import { fonts, radius, spacing } from "@/src/theme";

export function textOnColor(color: string): string {
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0A1420" : "#FFFFFF";
}

export function DkaBadge({ rating, color, size = "md" }: { rating: string; color: string; size?: "sm" | "md" }) {
  const pad = size === "sm" ? { pv: spacing.xs, ph: spacing.sm, fs: 11 } : { pv: 6, ph: spacing.md, fs: 13 };
  return (
    <View
      testID={`dka-badge-${rating}`}
      style={{
        backgroundColor: color,
        paddingVertical: pad.pv,
        paddingHorizontal: pad.ph,
        borderRadius: radius.sm,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.15)",
      }}
    >
      <Text style={{ color: textOnColor(color), fontFamily: fonts.monoBold, fontSize: pad.fs, letterSpacing: 0.5 }}>
        {rating.toUpperCase()}
      </Text>
    </View>
  );
}
