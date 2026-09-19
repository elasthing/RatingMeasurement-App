import { useRouter } from "expo-router";
import { CaretLeft, Gear } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";

export function Header({
  title,
  subtitle,
  showBack,
  showSettings,
  logo = "KHT",
  right,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
  logo?: string;
  right?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.rowInner}>
        {showBack ? (
          <Pressable style={styles.iconBtn} onPress={() => router.back()} testID="header-back">
            <CaretLeft size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
        ) : (
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>{logo}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
        {showSettings && (
          <Pressable style={styles.iconBtn} onPress={() => router.push("/settings")} testID="header-settings">
            <Gear size={22} color={colors.onSurfaceSecondary} weight="regular" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    backgroundColor: c.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowInner: { flexDirection: "row", alignItems: "center" },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: c.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontFamily: fonts.display, fontSize: 16, color: c.onBrandSecondary, letterSpacing: 0.5 },
  title: { fontFamily: fonts.displaySemi, fontSize: 20, color: c.onSurface, letterSpacing: 0.5 },
  subtitle: { fontFamily: fonts.mono, fontSize: 11, color: c.brandPrimary, marginTop: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    marginLeft: spacing.sm,
  },
}));
