import { Image } from "expo-image";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DkaCategory, useDkaScale } from "@/src/api";
import { textOnColor } from "@/src/components/DkaBadge";
import { Header } from "@/src/components/Header";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function DkaScaleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useDkaScale();

  const categories: DkaCategory[] = (data?.categories ?? []).slice().sort((a, b) => a.severity - b.severity);

  return (
    <View style={styles.screen}>
      <Header title="DKA Standard" subtitle="Reference rating chart" logo="DKA" showBack />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.info} />
              <Text style={styles.dim}>Memuat referensi…</Text>
            </View>
          ) : isError || !data ? (
            <View style={styles.center}>
              <Text style={styles.dim} onPress={() => refetch()}>Gagal memuat referensi. Tap untuk coba lagi.</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>DKA STANDARD REFERENCE</Text>
                <View style={styles.imageWrap}>
                  <Image source={{ uri: data.image }} style={styles.board} contentFit="contain" transition={200} />
                </View>
                <Text style={styles.note}>{data.note}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>KATEGORI RATING</Text>
                <Text style={styles.helper}>AI Vision membandingkan setiap tabung sampel dengan standar ini untuk menentukan rating.</Text>
                <View style={{ marginTop: spacing.sm }}>
                  {categories.map((cat, i) => (
                    <View key={cat.code} style={[styles.row, i === categories.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.swatch, { backgroundColor: cat.color }]}>
                        <Text style={[styles.swatchTxt, { color: textOnColor(cat.color) }]}>{cat.severity}</Text>
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowName}>{cat.code}</Text>
                        <Text style={styles.rowCond}>{cat.description}</Text>
                      </View>
                    </View>
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
  content: { padding: spacing.lg },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center", gap: spacing.lg },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted, textAlign: "center" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.info, letterSpacing: 1.5 },
  helper: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, lineHeight: 17, marginTop: spacing.sm },
  note: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceSecondary, lineHeight: 17, marginTop: spacing.md },
  imageWrap: { marginTop: spacing.md, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: c.border, backgroundColor: "#FFFFFF" },
  board: { width: "100%", aspectRatio: 1.333, backgroundColor: "#FFFFFF" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider, gap: spacing.md },
  swatch: { width: 52, height: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  swatchTxt: { fontFamily: fonts.display, fontSize: 22 },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onSurface },
  rowCond: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceSecondary, lineHeight: 16 },
}));
