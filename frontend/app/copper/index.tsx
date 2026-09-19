import { useRouter } from "expo-router";
import { ArrowRight, Coins, TestTube } from "phosphor-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useCopperDashboard } from "@/src/api";
import { CopperClassGauge } from "@/src/components/CopperClassGauge";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDateTime } from "@/src/utils/format";

export default function CopperDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useCopperDashboard();
  const latest = data?.latest;

  return (
    <View style={styles.screen}>
      <Header title="Copper Strip ASTM D130" subtitle="Copper Strip Corrosion" logo="CU" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.brandSecondary} />
            </View>
          ) : !latest ? (
            <View style={styles.center}>
              <TestTube size={48} color={colors.muted} weight="fill" />
              <Text style={styles.emptyTitle}>Belum ada uji</Text>
              <Text style={styles.dim}>Jalankan analisa AI Vision pertama Anda untuk melihat hasil.</Text>
              <Pressable style={styles.cta} onPress={() => router.push("/copper/new-test")} testID="copper-new-test-cta">
                <Text style={styles.ctaText}>RUN NEW TEST</Text>
              </Pressable>
              <ScaleLink onPress={() => router.push("/copper-scale")} />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardLabel}>LATEST RESULT</Text>
                  <StatusBadge status={latest.status} />
                </View>
                <Text style={styles.sampleId}>{latest.meta.sample_id}</Text>
                <View style={{ alignItems: "center", marginVertical: spacing.md }}>
                  <CopperClassGauge
                    classification={latest.classification}
                    group={latest.group}
                    color={latest.color}
                    status={latest.status}
                    confidence={latest.confidence}
                  />
                </View>
                <View style={styles.splitRow}>
                  <View style={styles.splitCell}>
                    <Text style={styles.splitLabel}>CLASSIFICATION</Text>
                    <Text style={styles.splitValue}>{latest.classification.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.splitCell, { borderLeftWidth: 1, borderLeftColor: colors.divider }]}>
                    <Text style={styles.splitLabel}>STANDARD</Text>
                    <Text style={styles.splitValue}>ASTM D130 / IP 154</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.reportBtn}
                  onPress={() => router.push(`/copper-result/${latest.id}`)}
                  testID="copper-view-report"
                >
                  <Text style={styles.reportBtnText}>VIEW FULL REPORT</Text>
                  <ArrowRight size={16} color={colors.onBrandSecondary} weight="bold" />
                </Pressable>
              </View>

              <View style={styles.statsRow}>
                <Stat label="TOTAL" value={String(data?.total ?? 0)} />
                <Stat label="CLEAR" value={String(data?.passed ?? 0)} color={colors.success} />
                <Stat label="TARNISH" value={String(data?.failed ?? 0)} color={colors.error} />
              </View>

              <ScaleLink onPress={() => router.push("/copper-scale")} />

              <View style={styles.card}>
                <Text style={styles.cardLabel}>DESKRIPSI KONDISI</Text>
                <Text style={styles.summary}>{latest.ai_summary || "—"}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>TEST INFORMATION</Text>
                <InfoRow k="Product / Fuel" v={latest.meta.product || "—"} />
                <InfoRow k="Batch / Lot" v={latest.meta.batch || "—"} />
                <InfoRow k="Operator" v={latest.meta.operator || "—"} />
                <InfoRow k="Test Condition" v={`${latest.meta.temperature_c}°C · ${latest.meta.duration_hours}h`} />
                <InfoRow k="Analyzed" v={fmtDateTime(latest.created_at)} last />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ScaleLink({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={styles.linkCard} onPress={onPress} testID="copper-scale-link">
      <View style={styles.linkIcon}>
        <Coins size={22} color={colors.brandSecondary} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>ASTM D130 Standard Chart</Text>
        <Text style={styles.linkSub}>Referensi warna korosi 1a – 4c</Text>
      </View>
      <ArrowRight size={18} color={colors.onSurfaceTertiary} weight="bold" />
    </Pressable>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: color ?? colors.onSurface }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoK}>{k}</Text>
      <Text style={styles.infoV} numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center", gap: spacing.lg },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted, textAlign: "center" },
  emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 22, color: c.onSurface },
  cta: {
    backgroundColor: c.brandSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  ctaText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onBrandSecondary, letterSpacing: 1 },

  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandSecondary, letterSpacing: 1.5 },
  sampleId: { fontFamily: fonts.monoBold, fontSize: 15, color: c.onSurface, marginTop: spacing.sm },
  summary: { fontFamily: fonts.mono, fontSize: 13, color: c.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 },

  splitRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.divider, marginTop: spacing.sm },
  splitCell: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  splitLabel: { fontFamily: fonts.mono, fontSize: 9, color: c.muted, letterSpacing: 1 },
  splitValue: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onSurface, marginTop: 3 },

  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: c.brandSecondary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  reportBtnText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onBrandSecondary, letterSpacing: 1 },

  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    alignSelf: "stretch",
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "#3A2A10",
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: c.onSurface, letterSpacing: 0.3 },
  linkSub: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28 },
  statLabel: { fontFamily: fonts.mono, fontSize: 9, color: c.muted, letterSpacing: 1 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    marginTop: spacing.xs,
  },
  infoK: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary, flex: 1 },
  infoV: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurface, flex: 1, textAlign: "right" },
}));
