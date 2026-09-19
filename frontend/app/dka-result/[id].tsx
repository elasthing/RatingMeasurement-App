import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Export, TrashSimple } from "phosphor-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DkaSample, DKA_CATEGORIES, fileUrl, useDeleteDka, useDkaScale, useDkaTest, useUpdateDka } from "@/src/api";
import { Header } from "@/src/components/Header";
import { textOnColor } from "@/src/components/DkaBadge";
import { useToast } from "@/src/components/Toast";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDateTime } from "@/src/utils/format";
import { buildDkaSingleHtml, printHtmlOnWeb, sharePdfNative } from "@/src/utils/dka-pdf";

export default function DkaResult() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rec, isLoading, isError } = useDkaTest(id);
  const { data: scale } = useDkaScale();
  const del = useDeleteDka();
  const update = useUpdateDka();
  const [exporting, setExporting] = useState(false);

  const colorFor = (code: string) =>
    scale?.categories?.find((c) => c.code === code)?.color ??
    { CLEAR: "#E3EAEC", "Aspect 1": "#C68A3E", "Aspect 2": "#6E3B18", "Aspect 3": "#161616" }[code] ??
    "#888";

  async function changeRating(index: number, code: string) {
    if (!rec) return;
    try {
      await update.mutateAsync({ id: rec.id, changes: { samples: [{ index, rating: code }] } });
    } catch (e: any) {
      toast(e?.message ? String(e.message).slice(0, 120) : "Gagal menyimpan.", "error");
    }
  }

  async function saveSampleId(index: number, sample_id: string) {
    if (!rec) return;
    const cur = rec.samples.find((s) => s.index === index);
    if (!cur || cur.sample_id === sample_id.trim() || !sample_id.trim()) return;
    try {
      await update.mutateAsync({ id: rec.id, changes: { samples: [{ index, sample_id }] } });
    } catch (e: any) {
      toast(e?.message ? String(e.message).slice(0, 120) : "Gagal menyimpan.", "error");
    }
  }

  async function exportPdf() {
    if (!rec) return;
    setExporting(true);
    try {
      const html = await buildDkaSingleHtml(rec);
      if (Platform.OS === "web") {
        printHtmlOnWeb(html);
      } else {
        const stamp = new Date(rec.created_at).toISOString().slice(0, 10);
        const shared = await sharePdfNative(html, `DKA_${rec.meta.batch_id || rec.id}_${stamp}`, "DKA Batch Report");
        if (!shared) toast("PDF generated.", "success");
      }
    } catch (e: any) {
      toast(`Export PDF gagal: ${e?.message ? String(e.message).slice(0, 140) : "unknown error"}`, "error");
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    if (!rec) return;
    try {
      await del.mutateAsync(rec.id);
      toast("Batch deleted", "success");
      router.back();
    } catch {
      toast("Delete failed", "error");
    }
  }

  return (
    <View style={styles.screen}>
      <Header
        title="Batch Result"
        subtitle={rec?.meta.batch_id}
        logo="DKA"
        showBack
        right={
          <Pressable style={styles.hIcon} onPress={exportPdf} disabled={exporting} testID="dka-export-pdf">
            {exporting ? <ActivityIndicator size="small" color={colors.info} /> : <Export size={20} color={colors.info} weight="bold" />}
          </Pressable>
        }
      />
      {isError ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Batch tidak ditemukan.</Text>
          <Pressable style={styles.backHome} onPress={() => router.replace("/dka")} testID="dka-go-home">
            <Text style={styles.backHomeText}>KEMBALI KE DASHBOARD</Text>
          </Pressable>
        </View>
      ) : isLoading || !rec ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.info} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>
              <Text style={styles.hint}>{rec.samples.length} tabung terdeteksi (kiri → kanan). Koreksi Sample ID & rating jika perlu.</Text>

              {rec.samples.map((s) => (
                <SampleEditor
                  key={s.index}
                  sample={s}
                  colorFor={colorFor}
                  busy={update.isPending}
                  onRating={(code) => changeRating(s.index, code)}
                  onSaveId={(sid) => saveSampleId(s.index, sid)}
                />
              ))}

              <View style={styles.card}>
                <Text style={styles.cardLabel}>BATCH INFORMATION</Text>
                <Info k="Batch ID" v={rec.meta.batch_id || "—"} />
                <Info k="Product" v={rec.meta.product || "—"} />
                <Info k="Operator" v={rec.meta.operator || "—"} />
                <Info k="Condition" v={`${rec.meta.temperature_c}°C · ${rec.meta.duration_hours}h`} />
                <Info k="Analyzed" v={fmtDateTime(rec.created_at)} />
                <Info k="AI Model" v={rec.ai_model} last />
              </View>

              <Pressable style={styles.exportBtn} onPress={exportPdf} disabled={exporting} testID="dka-export-report-btn">
                <Export size={18} color={colors.onInfo} weight="bold" />
                <Text style={styles.exportText}>EXPORT PDF BATCH REPORT</Text>
              </Pressable>

              <Pressable style={styles.deleteBtn} onPress={onDelete} testID="dka-delete-test">
                <TrashSimple size={16} color={colors.error} />
                <Text style={styles.deleteText}>Hapus batch ini</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function SampleEditor({
  sample,
  colorFor,
  busy,
  onRating,
  onSaveId,
}: {
  sample: DkaSample;
  colorFor: (code: string) => string;
  busy: boolean;
  onRating: (code: string) => void;
  onSaveId: (sid: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [sid, setSid] = useState(sample.sample_id);

  return (
    <View style={styles.card} testID={`dka-editor-${sample.index}`}>
      <View style={styles.sampleHead}>
        <Image source={{ uri: fileUrl(sample.crop_path || "") }} style={styles.crop} contentFit="cover" transition={200} />
        <View style={{ flex: 1 }}>
          <Text style={styles.idx}>SAMPLE #{sample.index}</Text>
          <Text style={styles.fieldLabel}>Sample ID (OCR)</Text>
          <TextInput
            testID={`dka-sid-${sample.index}`}
            value={sid}
            onChangeText={setSid}
            onEndEditing={() => onSaveId(sid)}
            onBlur={() => onSaveId(sid)}
            style={styles.input}
            placeholder={`Unknown ${sample.index}`}
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.conf}>Confidence {sample.confidence.toFixed(0)}%</Text>
        </View>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Rating</Text>
      <View style={styles.chips}>
        {DKA_CATEGORIES.map((code) => {
          const active = code === sample.rating;
          const col = colorFor(code);
          return (
            <Pressable
              key={code}
              testID={`dka-rate-${sample.index}-${code}`}
              disabled={busy}
              onPress={() => onRating(code)}
              style={[styles.chip, { backgroundColor: col }, active && styles.chipActive, busy && { opacity: 0.6 }]}
            >
              <Text style={[styles.chipText, { color: textOnColor(col) }]}>{code}</Text>
            </Pressable>
          );
        })}
      </View>

      {!!sample.summary && <Text style={styles.summary}>{sample.summary}</Text>}
    </View>
  );
}

function Info({ k, v, last }: { k: string; v: string; last?: boolean }) {
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center", gap: spacing.lg },
  hint: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary, lineHeight: 18 },
  hIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.info, letterSpacing: 1.5 },
  sampleHead: { flexDirection: "row", gap: spacing.md },
  crop: { width: 96, height: 128, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  idx: { fontFamily: fonts.mono, fontSize: 10, color: c.info, letterSpacing: 1 },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 10, color: c.onSurfaceTertiary, marginTop: spacing.sm },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 42, marginTop: 4, fontFamily: fonts.monoMedium, fontSize: 14, color: c.onSurface },
  conf: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: { paddingHorizontal: spacing.md, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  chipActive: { borderColor: c.onSurface },
  chipText: { fontFamily: fonts.monoBold, fontSize: 12 },
  summary: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceSecondary, marginTop: spacing.md, lineHeight: 18 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider, marginTop: spacing.xs },
  infoK: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary, flex: 1 },
  infoV: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurface, flex: 1, textAlign: "right" },
  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: c.info, borderRadius: radius.md, height: 52 },
  exportText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onInfo, letterSpacing: 1 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md },
  deleteText: { fontFamily: fonts.mono, fontSize: 12, color: c.error },
  errText: { fontFamily: fonts.mono, fontSize: 13, color: c.muted, marginBottom: spacing.lg },
  backHome: { backgroundColor: c.info, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md },
  backHomeText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onInfo, letterSpacing: 1 },
}));
