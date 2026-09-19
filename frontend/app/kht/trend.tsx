import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { useTrend } from "@/src/api";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { TrendChart } from "@/src/components/TrendChart";
import { fonts, makeStyles, radius, ratingColor, spacing, useTheme } from "@/src/theme";
import { fmtDate } from "@/src/utils/format";

export default function Trend() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading } = useTrend();
  const { width: winW } = useWindowDimensions();
  const chartW = Math.max(240, Math.min(winW, 640) - spacing.lg * 4);

  const points = (data ?? []).map((d) => ({ rating: d.rating, sample_id: d.sample_id }));

  return (
    <View style={styles.screen}>
      <Header title="Chart & Trend" subtitle="Rating history" showSettings />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : points.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.dim}>Insufficient data to plot trend.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>KHT RATING TREND</Text>
              <View style={{ marginTop: spacing.md }}>
                <TrendChart data={points} width={chartW} />
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
                      testID={`trend-point-${d.id}`}
                      onPress={() => router.push(`/result/${d.id}`)}
                      style={[styles.row, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sample}>{d.sample_id || "—"}</Text>
                        <Text style={styles.date}>{fmtDate(d.created_at)}</Text>
                      </View>
                      <Text style={[styles.rating, { color: ratingColor(d.rating) }]}>{d.rating.toFixed(1)}</Text>
                      <View style={{ marginLeft: spacing.md }}>
                        <StatusBadge status={d.status} size="sm" />
                      </View>
                    </Pressable>
                  ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandPrimary, letterSpacing: 1.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  sample: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  date: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 2 },
  rating: { fontFamily: fonts.display, fontSize: 26 },
}));
