import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { useDkaTrend } from "@/src/api";
import { DkaTrendChart } from "@/src/components/DkaTrendChart";
import { Header } from "@/src/components/Header";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDate } from "@/src/utils/format";

export default function DkaTrend() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useDkaTrend();
  const { width: winW } = useWindowDimensions();
  const chartW = Math.max(240, Math.min(winW, 640) - spacing.lg * 4);

  return (
    <View style={styles.screen}>
      <Header title="Chart & Trend" subtitle="Batch severity history" logo="DKA" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.info} />
            </View>
          ) : (data ?? []).length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.dim}>Data belum cukup untuk plot tren.</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>DKA BATCH TREND</Text>
                <View style={{ marginTop: spacing.md }}>
                  <DkaTrendChart data={data ?? []} width={chartW} />
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>DATA POINTS</Text>
                <View style={{ marginTop: spacing.sm }}>
                  {(data ?? [])
                    .slice()
                    .reverse()
                    .map((d, i, arr) => (
                      <Pressable key={d.id} testID={`dka-trend-point-${d.id}`} onPress={() => router.push(`/dka-result/${d.id}`)} style={[styles.row, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sample}>{d.batch_id || "—"}</Text>
                          <Text style={styles.date}>{fmtDate(d.created_at)} · {d.count} sampel</Text>
                        </View>
                        <Text style={styles.avg}>{d.avg_severity.toFixed(2)}</Text>
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
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.info, letterSpacing: 1.5 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  sample: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  date: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 2 },
  avg: { fontFamily: fonts.display, fontSize: 24, color: c.info },
}));
