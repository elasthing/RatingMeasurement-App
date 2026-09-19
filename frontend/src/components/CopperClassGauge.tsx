import { Text, View } from "react-native";

import { statusLabel } from "@/src/api";
import { fonts, spacing, useTheme } from "@/src/theme";

// Light text on dark swatches, dark text on light swatches.
function textOn(color: string): string {
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0A1420" : "#FFFFFF";
}

export function CopperClassGauge({
  classification,
  group,
  color,
  status,
  confidence,
  size = 168,
}: {
  classification: string;
  group: string;
  color: string;
  status: string;
  confidence: number;
  size?: number;
}) {
  const { colors } = useTheme();
  const clear = statusLabel(status) === "CLEAR";
  const swatchText = textOn(color);
  return (
    <View style={{ alignItems: "center" }} testID="copper-class-gauge">
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 6,
          borderColor: clear ? colors.success : colors.error,
        }}
      >
        <Text style={{ fontFamily: fonts.display, fontSize: 60, color: swatchText, lineHeight: 62 }}>
          {classification.toUpperCase()}
        </Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: swatchText, letterSpacing: 1, opacity: 0.85 }}>
          ASTM D130 CLASS
        </Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.displaySemi,
          fontSize: 20,
          color: clear ? colors.success : colors.error,
          marginTop: spacing.sm,
          letterSpacing: 1,
        }}
      >
        {group.toUpperCase()}
      </Text>
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 2 }}>
        CONFIDENCE {confidence.toFixed(1)}%
      </Text>
    </View>
  );
}
