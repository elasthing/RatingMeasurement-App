import { useRouter } from "expo-router";
import { ArrowRight, Coins, Flask, ShieldCheck } from "phosphor-react-native";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCopperDashboard, useDashboard } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kht = useDashboard();
  const copper = useCopperDashboard();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <ShieldCheck size={24} color={colors.onBrand} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>LAB AI VISION</Text>
              <Text style={styles.brandSub}>Fuel & Lubricant Analysis Suite</Text>
            </View>
          </View>

          <Text style={styles.pick}>PILIH MODUL ANALISA</Text>

          {/* K-HTT ANALYST */}
          <ModuleCard
            testID="module-kht"
            accent={colors.brandPrimary}
            onAccent={colors.onBrandPrimary}
            tile={colors.brandTertiary}
            icon={<Flask size={30} color={colors.brandPrimary} weight="fill" />}
            title="K-HTT ANALYST"
            subtitle="Komatsu Hot Tube Tester"
            desc="Rating endapan 0–10 (Nikko Color Scale) untuk oli & pelumas."
            stat={`${kht.data?.total ?? 0} sampel · ${kht.data?.passed ?? 0} clear`}
            onPress={() => router.push("/kht")}
          />

          {/* Copper Strip ASTM D130 */}
          <ModuleCard
            testID="module-copper"
            accent={colors.brandSecondary}
            onAccent={colors.onBrandSecondary}
            tile="#3A2A10"
            icon={<Coins size={30} color={colors.brandSecondary} weight="fill" />}
            title="Copper Strip ASTM D130"
            subtitle="ASTM D130 / IP 154 · Copper Strip Corrosion"
            desc="Klasifikasi korosi tembaga 1a–4c dengan status CLEAR / TARNISH."
            stat={`${copper.data?.total ?? 0} sampel · ${copper.data?.passed ?? 0} clear`}
            onPress={() => router.push("/copper")}
          />

          <Text style={styles.footer}>AI Vision powered by Gemini · © 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ModuleCard({
  testID,
  accent,
  onAccent,
  tile,
  icon,
  title,
  subtitle,
  desc,
  stat,
  onPress,
}: {
  testID: string;
  accent: string;
  onAccent: string;
  tile: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  desc: string;
  stat: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }: { pressed: boolean }) => [styles.card, { borderColor: accent }, pressed && { opacity: 0.85 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: tile }]}>{icon}</View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[styles.cardTitle, { color: accent }]}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={styles.cardDesc}>{desc}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.cardStat}>{stat}</Text>
        <View style={[styles.openBtn, { backgroundColor: accent }]}>
          <Text style={[styles.openText, { color: onAccent }]}>BUKA</Text>
          <ArrowRight size={15} color={onAccent} weight="bold" />
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center", gap: spacing.lg },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface, letterSpacing: 1 },
  brandSub: { fontFamily: fonts.mono, fontSize: 11, color: c.brandPrimary, marginTop: 1 },
  pick: { fontFamily: fonts.mono, fontSize: 11, color: c.muted, letterSpacing: 1.5, marginTop: spacing.sm },

  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  cardIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.5 },
  cardSubtitle: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, marginTop: 2 },
  cardDesc: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceSecondary, lineHeight: 18 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  cardStat: { fontFamily: fonts.monoMedium, fontSize: 11, color: c.muted },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  openText: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 1 },
  footer: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, textAlign: "center", marginTop: spacing.lg },
}));
