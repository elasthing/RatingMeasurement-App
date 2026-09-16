import { useRouter } from "expo-router";
import { ArrowRight, Flask, Palette } from "phosphor-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useDashboard } from "@/src/api";
import { Header } from "@/src/components/Header";
import { KHTScale, KHTScaleDetail } from "@/src/components/KHTScale";
import { ParameterTable } from "@/src/components/ParameterTable";
import { RatingGauge } from "@/src/components/RatingGauge";
import { StatusBadge } from "@/src/components/StatusBadge";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDateTime } from "@/src/utils/format";

export default function Dashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useDashboard();

  const latest = data?.latest;

  return (
    <View style={styles.screen}>
      <Header title="KHT AI VISION" subtitle="Komatsu Hot Tube Tester" showSettings />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={styles.dim}>Scanning latest results…</Text>
          </View>
        ) : !latest ? (
          <View style={styles.center}>
            <Flask size={48} color={colors.muted} weight="fill" />
            <Text style={styles.emptyTitle}>No tests yet</Text>
            <Text style={styles.dim}>Run your first AI Vision analysis to see results here.</Text>
            <Pressable style={styles.cta} onPress={() => router.push("/new-test")} testID="dashboard-new-test">
              <Text style={styles.ctaText}>RUN NEW TEST</Text>
            </Pressable>
            <Pressable
              style={styles.linkCard}
              onPress={() => router.push("/color-scale")}
              testID="dashboard-color-scale-empty"
            >
              <View style={styles.linkIcon}>
                <Palette size={22} color={colors.brandPrimary} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Nikko Color Scale</Text>
                <Text style={styles.linkSub}>Standar referensi warna 0 – 10</Text>
              </View>
              <ArrowRight size={18} color={colors.onSurfaceTertiary} weight="bold" />
            </Pressable>
          </View>
        ) : (
          <>
            {/* Hero result */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>LATEST RESULT</Text>
                <StatusBadge status={latest.status} />
              </View>
              <Text style={styles.sampleId}>{latest.meta.sample_id}</Text>
              <View style={{ alignItems: "center", marginVertical: spacing.md }}>
                <RatingGauge rating={latest.rating} performance={latest.performance} confidence={latest.confidence} />
              </View>
              <View style={styles.splitRow}>
                <View style={styles.splitCell}>
                  <Text style={styles.splitLabel}>DEPOSIT LEVEL</Text>
                  <Text style={styles.splitValue}>{latest.deposit_level_label || "—"}</Text>
                </View>
                <View style={[styles.splitCell, { borderLeftWidth: 1, borderLeftColor: colors.divider }]}>
                  <Text style={styles.splitLabel}>AI MODEL</Text>
                  <Text style={styles.splitValue}>KHT-AI-V2</Text>
                </View>
              </View>
              <Pressable
                style={styles.reportBtn}
                onPress={() => router.push(`/result/${latest.id}`)}
                testID="dashboard-view-report"
              >
                <Text style={styles.reportBtnText}>VIEW FULL REPORT</Text>
                <ArrowRight size={16} color={colors.onBrandPrimary} weight="bold" />
              </Pressable>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <Stat label="TOTAL" value={String(data?.total ?? 0)} />
              <Stat label="CLEAR" value={String(data?.passed ?? 0)} color={colors.success} />
              <Stat label="TARNISH" value={String(data?.failed ?? 0)} color={colors.error} />
              <Stat label="AVG" value={(data?.avg_rating ?? 0).toFixed(1)} color={colors.brandSecondary} />
            </View>

            {/* KHT standard scale */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>KHT STANDARD RATING REFERENCE</Text>
              <View style={{ marginTop: spacing.md }}>
                <KHTScale current={latest.rating} />
              </View>
            </View>

            {/* Nikko Color Scale reference entry */}
            <Pressable
              style={styles.linkCard}
              onPress={() => router.push("/color-scale")}
              testID="dashboard-color-scale"
            >
              <View style={styles.linkIcon}>
                <Palette size={22} color={colors.brandPrimary} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Nikko Color Scale</Text>
                <Text style={styles.linkSub}>Standar referensi warna 0 – 10</Text>
              </View>
              <ArrowRight size={18} color={colors.onSurfaceTertiary} weight="bold" />
            </Pressable>

            {/* Parameter preview */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>PARAMETER ANALYSIS</Text>
              <View style={{ marginTop: spacing.sm }}>
                <ParameterTable parameters={latest.parameters} />
              </View>
            </View>

            {/* Test info */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>TEST INFORMATION</Text>
              <InfoRow k="Oil / Product" v={latest.meta.oil_type || "—"} />
              <InfoRow k="Batch / Lot" v={latest.meta.batch || "—"} />
              <InfoRow k="Operator" v={latest.meta.operator || "—"} />
              <InfoRow
                k="Test Condition"
                v={`${latest.meta.temperature_c}°C · ${latest.meta.duration_hours}h`}
              />
              <InfoRow k="Air / Oil Flow" v={`${latest.meta.air_flow} / ${latest.meta.oil_flow} mL/min`} />
              <InfoRow k="Analyzed" v={fmtDateTime(latest.created_at)} last />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>STANDARD SCALE (KES)</Text>
              <View style={{ marginTop: spacing.sm }}>
                <KHTScaleDetail />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: string; color?: string; icon?: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      {icon}
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted, textAlign: "center" },
  emptyTitle: { fontFamily: fonts.displaySemi, fontSize: 22, color: c.onSurface },
  cta: {
    backgroundColor: c.brandPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  ctaText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onBrandPrimary, letterSpacing: 1 },

  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandPrimary, letterSpacing: 1.5 },
  sampleId: { fontFamily: fonts.monoBold, fontSize: 15, color: c.onSurface, marginTop: spacing.sm },

  splitRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.divider, marginTop: spacing.sm },
  splitCell: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  splitLabel: { fontFamily: fonts.mono, fontSize: 9, color: c.muted, letterSpacing: 1 },
  splitValue: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onSurface, marginTop: 3 },

  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: c.brandPrimary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  reportBtnText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onBrandPrimary, letterSpacing: 1 },

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
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: c.onSurface, letterSpacing: 0.3 },
  linkSub: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: spacing.sm },  stat: {
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
