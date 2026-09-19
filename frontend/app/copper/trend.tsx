import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { useCopperTrend } from "@/src/api";
import { CopperTrendChart } from "@/src/components/CopperTrendChart";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDate } from "@/src/utils/format";

export default function CopperTrend() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useCopperTrend();
  const { width: winW } = useWindowDimensions();
  const chartW = Math.max(240, Math.min(winW, 640) - spacing.lg * 4);

  return (
    <View style={styles.screen}>
      <Header title="Chart & Trend" subtitle="Corrosion history" logo="CU" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.brandSecondary} />
            </View>
          ) : (data ?? []).length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.dim}>Data belum cukup untuk plot tren.</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>COPPER CORROSION TREND</Text>
                <View style={{ marginTop: spacing.md }}>
                  <CopperTrendChart data={data ?? []} width={chartW} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>DATA POINTS</Text>
                <View style={{ marginTop: spacing.sm }}>
                  {(data ?? [])
                    .slice()
                    .reverse()
                    .map((d, i, arr) => (
                      <Pressable
                        key={d.id}
                        testID={`copper-trend-point-${d.id}`}
                        onPress={() => router.push(`/copper-result/${d.id}`)}
                        style={[styles.row, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sample}>{d.sample_id || "—"}</Text>
                          <Text style={styles.date}>{fmtDate(d.created_at)}</Text>
                        </View>
                        <Text style={styles.classCode}>{d.classification.toUpperCase()}</Text>
                        <View style={{ marginLeft: spacing.md }}>
                          <StatusBadge status={d.status} size="sm" />
                        </View>
                      </Pressable>
                    ))}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center", gap: spacing.lg },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandSecondary, letterSpacing: 1.5 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  sample: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  date: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 2 },
  classCode: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
}));
