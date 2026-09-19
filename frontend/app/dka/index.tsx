import { useRouter } from "expo-router";
import { ArrowRight, Drop, Stack as StackIcon } from "phosphor-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useDkaDashboard } from "@/src/api";
import { DkaSampleCard } from "@/src/components/DkaSampleCard";
import { Header } from "@/src/components/Header";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDateTime } from "@/src/utils/format";

export default function DkaDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useDkaDashboard();
  const latest = data?.latest;

  return (
    <View style={styles.screen}>
      <Header title="Rating DKA" subtitle="Batch tube analysis" logo="DKA" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.info} />
            </View>
          ) : !latest ? (
            <View style={styles.center}>
              <StackIcon size={48} color={colors.muted} weight="fill" />
              <Text style={styles.emptyTitle}>Belum ada batch</Text>
              <Text style={styles.dim}>Foto hingga 4 tabung sekaligus untuk analisa batch pertama.</Text>
              <Pressable style={styles.cta} onPress={() => router.push("/dka/new-test")} testID="dka-new-test-cta">
                <Text style={styles.ctaText}>RUN NEW BATCH</Text>
              </Pressable>
              <ScaleLink onPress={() => router.push("/dka-scale")} />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardLabel}>LATEST BATCH</Text>
                  <Text style={styles.count}>{latest.samples.length} sampel</Text>
                </View>
                <Text style={styles.sampleId}>{latest.meta.batch_id || latest.id.slice(0, 8)}</Text>
                <View style={styles.grid}>
                  {latest.samples.map((s) => (
                    <DkaSampleCard key={s.index} sample={s} />
                  ))}
                </View>
                <Pressable style={styles.reportBtn} onPress={() => router.push(`/dka-result/${latest.id}`)} testID="dka-view-report">
                  <Text style={styles.reportBtnText}>VIEW FULL REPORT</Text>
                  <ArrowRight size={16} color={colors.onInfo} weight="bold" />
                </Pressable>
              </View>

              <View style={styles.statsRow}>
                <Stat label="BATCHES" value={String(data?.total_batches ?? 0)} />
                <Stat label="SAMPLES" value={String(data?.total_samples ?? 0)} color={colors.info} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>DISTRIBUSI RATING</Text>
                <View style={{ marginTop: spacing.sm }}>
                  {["CLEAR", "Aspect 1", "Aspect 2", "Aspect 3"].map((k, i, arr) => (
                    <View key={k} style={[styles.distRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.distK}>{k}</Text>
                      <Text style={styles.distV}>{data?.distribution?.[k] ?? 0}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <ScaleLink onPress={() => router.push("/dka-scale")} />

              <View style={styles.card}>
                <Text style={styles.cardLabel}>TEST INFORMATION</Text>
                <InfoRow k="Batch ID" v={latest.meta.batch_id || "—"} />
                <InfoRow k="Product" v={latest.meta.product || "—"} />
                <InfoRow k="Operator" v={latest.meta.operator || "—"} />
                <InfoRow k="Condition" v={`${latest.meta.temperature_c}°C · ${latest.meta.duration_hours}h`} />
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
    <Pressable style={styles.linkCard} onPress={onPress} testID="dka-scale-link">
      <View style={styles.linkIcon}>
        <Drop size={22} color={colors.info} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>DKA Standard Reference</Text>
        <Text style={styles.linkSub}>CLEAR · Aspect 1 · Aspect 2 · Aspect 3</Text>
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
      <Text style={styles.infoV} numberOfLines={1}>{v}</Text>
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
  cta: { backgroundColor: c.info, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md, marginTop: spacing.md },
  ctaText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onInfo, letterSpacing: 1 },

  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.info, letterSpacing: 1.5 },
  count: { fontFamily: fonts.monoBold, fontSize: 11, color: c.onSurfaceTertiary },
  sampleId: { fontFamily: fonts.monoBold, fontSize: 15, color: c.onSurface, marginTop: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },

  reportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: c.info, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  reportBtnText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onInfo, letterSpacing: 1 },

  linkCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, alignSelf: "stretch", backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  linkIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: "#122A4A", alignItems: "center", justifyContent: "center" },
  linkTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: c.onSurface, letterSpacing: 0.3 },
  linkSub: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingVertical: spacing.md, alignItems: "center", gap: 2 },
  statValue: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28 },
  statLabel: { fontFamily: fonts.mono, fontSize: 9, color: c.muted, letterSpacing: 1 },

  distRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  distK: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary },
  distV: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },

  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider, marginTop: spacing.xs },
  infoK: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary, flex: 1 },
  infoV: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurface, flex: 1, textAlign: "right" },
}));
