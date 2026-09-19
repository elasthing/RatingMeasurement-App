import { Image } from "expo-image";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CopperClass, useCopperScale } from "@/src/api";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

function textOn(color: string): string {
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0A1420" : "#FFFFFF";
}

export default function CopperScaleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useCopperScale();

  const classes: CopperClass[] = (data?.classes ?? []).slice().sort((a, b) => a.severity - b.severity);

  return (
    <View style={styles.screen}>
      <Header title="ASTM D130 Standard" subtitle="Copper strip corrosion chart" logo="CU" showBack />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.brandSecondary} />
              <Text style={styles.dim}>Memuat referensi…</Text>
            </View>
          ) : isError || !data ? (
            <View style={styles.center}>
              <Text style={styles.dim} onPress={() => refetch()}>
                Gagal memuat referensi. Tap untuk coba lagi.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>ASTM COPPER STRIP CORROSION STANDARDS</Text>
                <View style={styles.imageWrap}>
                  <Image source={{ uri: data.image }} style={styles.boardImage} contentFit="contain" transition={200} />
                </View>
                <Text style={styles.note}>{data.note}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardLabel}>CLASSIFICATION LEVELS</Text>
                <Text style={styles.helper}>
                  Bandingkan warna copper strip sampel dengan level di bawah ini. AI Vision juga membandingkannya dengan chart standar ini.
                </Text>
                <View style={{ marginTop: spacing.sm }}>
                  {classes.map((cls, i) => (
                    <LevelRow key={cls.code} cls={cls} last={i === classes.length - 1} />
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

function LevelRow({ cls, last }: { cls: CopperClass; last?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.swatch, { backgroundColor: cls.color }]}>
        <Text style={[styles.swatchNum, { color: textOn(cls.color) }]}>{cls.code.toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {cls.group}
          </Text>
          <StatusBadge status={cls.status} size="sm" />
        </View>
        <Text style={styles.rowCondition}>{cls.description}</Text>
      </View>
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
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandSecondary, letterSpacing: 1.5 },
  helper: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, lineHeight: 17, marginTop: spacing.sm },
  note: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceSecondary, lineHeight: 17, marginTop: spacing.md },
  imageWrap: { marginTop: spacing.md, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: c.border, backgroundColor: "#F4F1EC" },
  boardImage: { width: "100%", aspectRatio: 1.667, backgroundColor: "#F4F1EC" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider, gap: spacing.md },
  swatch: { width: 52, height: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  swatchNum: { fontFamily: fonts.display, fontSize: 20 },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowName: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface, flex: 1 },
  rowCondition: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceSecondary, lineHeight: 16 },
}));
