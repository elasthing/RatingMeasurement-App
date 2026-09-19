import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Export, PencilSimple, TrashSimple, X } from "phosphor-react-native";
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

import { CopperUpdate, fileUrl, statusLabel, useCopperTest, useDeleteCopperTest, useUpdateCopperTest } from "@/src/api";
import { CopperClassGauge } from "@/src/components/CopperClassGauge";
import { CopperClassPicker } from "@/src/components/CopperClassPicker";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useToast } from "@/src/components/Toast";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDateTime } from "@/src/utils/format";
import { buildCopperSingleHtml, printHtmlOnWeb, sharePdfNative } from "@/src/utils/copper-pdf";

export default function CopperResult() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: test, isLoading, isError } = useCopperTest(id);
  const del = useDeleteCopperTest();
  const update = useUpdateCopperTest();
  const [exporting, setExporting] = useState(false);

  type EditSection = "class" | "summary" | "recommendation" | null;
  const [editing, setEditing] = useState<EditSection>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [recDraft, setRecDraft] = useState("");

  function startEdit(section: Exclude<EditSection, null>) {
    if (!test) return;
    if (section === "summary") setSummaryDraft(test.ai_summary || "");
    if (section === "recommendation") setRecDraft(test.recommendation || "");
    setEditing(section);
  }

  async function changeClass(code: string) {
    if (!test || code === test.classification) return;
    try {
      await update.mutateAsync({ id: test.id, changes: { classification: code } });
      toast(`Klasifikasi diperbarui ke ${code.toUpperCase()}.`, "success");
    } catch (e: any) {
      toast(e?.message ? String(e.message).slice(0, 120) : "Gagal menyimpan.", "error");
    }
  }

  async function saveEdit() {
    if (!test || !editing) return;
    const changes: CopperUpdate = {};
    if (editing === "summary") changes.ai_summary = summaryDraft.trim();
    else if (editing === "recommendation") changes.recommendation = recDraft.trim();
    try {
      await update.mutateAsync({ id: test.id, changes });
      toast("Perubahan tersimpan.", "success");
      setEditing(null);
    } catch (e: any) {
      toast(e?.message ? String(e.message).slice(0, 120) : "Gagal menyimpan.", "error");
    }
  }

  function EditControls({ section }: { section: Exclude<EditSection, null> }) {
    if (editing === section) {
      return (
        <View style={styles.editActions}>
          <Pressable style={styles.cancelBtn} onPress={() => setEditing(null)} disabled={update.isPending} testID={`copper-cancel-${section}`}>
            <X size={15} color={colors.onSurfaceTertiary} weight="bold" />
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={saveEdit} disabled={update.isPending} testID={`copper-save-${section}`}>
            {update.isPending ? <ActivityIndicator size="small" color={colors.onBrandSecondary} /> : <Check size={14} color={colors.onBrandSecondary} weight="bold" />}
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <Pressable style={styles.editBtn} onPress={() => startEdit(section)} testID={`copper-edit-${section}`}>
        <PencilSimple size={13} color={colors.brandSecondary} weight="bold" />
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
    );
  }

  async function exportPdf() {
    if (!test) return;
    setExporting(true);
    try {
      const html = await buildCopperSingleHtml(test);
      if (Platform.OS === "web") {
        printHtmlOnWeb(html);
      } else {
        const stamp = new Date(test.created_at).toISOString().slice(0, 10);
        const shared = await sharePdfNative(html, `CopperStrip_${test.meta.sample_id || test.id}_${stamp}`, "Copper Strip Report");
        if (!shared) toast("PDF generated.", "success");
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message).slice(0, 140) : "unknown error";
      toast(`Export PDF gagal: ${msg}`, "error");
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    if (!test) return;
    try {
      await del.mutateAsync(test.id);
      toast("Test deleted", "success");
      router.back();
    } catch {
      toast("Delete failed", "error");
    }
  }

  return (
    <View style={styles.screen}>
      <Header
        title="AI Analysis Result"
        subtitle={test?.meta.sample_id}
        logo="CU"
        showBack
        right={
          <Pressable style={styles.hIcon} onPress={exportPdf} disabled={exporting} testID="copper-export-pdf">
            {exporting ? <ActivityIndicator size="small" color={colors.brandSecondary} /> : <Export size={20} color={colors.brandSecondary} weight="bold" />}
          </Pressable>
        }
      />
      {isError ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Data uji tidak ditemukan.</Text>
          <Pressable style={styles.backHome} onPress={() => router.replace("/copper")} testID="copper-go-home">
            <Text style={styles.backHomeText}>KEMBALI KE DASHBOARD</Text>
          </Pressable>
        </View>
      ) : isLoading || !test ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandSecondary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inner}>
              {/* photo */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>SAMPLE PHOTO</Text>
                <Image source={{ uri: fileUrl(test.image_path) }} style={styles.photo} contentFit="contain" transition={200} />
              </View>

              {/* class result */}
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardLabel}>ASTM D130 CLASSIFICATION</Text>
                  <StatusBadge status={test.status} size="sm" />
                </View>
                <View style={{ alignItems: "center", marginVertical: spacing.md }}>
                  <CopperClassGauge
                    classification={test.classification}
                    group={test.group}
                    color={test.color}
                    status={test.status}
                    confidence={test.confidence}
                  />
                </View>
                <Text style={styles.classDesc}>{test.description}</Text>
              </View>

              {/* manual correction */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>KOREKSI MANUAL KELAS</Text>
                <Text style={styles.helper}>Tap kelas yang sesuai jika hasil AI perlu dikoreksi. Status CLEAR/TARNISH dihitung otomatis.</Text>
                <View style={{ marginTop: spacing.sm, opacity: update.isPending ? 0.6 : 1 }}>
                  <CopperClassPicker value={test.classification} onChange={changeClass} disabled={update.isPending} />
                </View>
              </View>

              {/* summary */}
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardLabel}>DESKRIPSI KONDISI</Text>
                  <EditControls section="summary" />
                </View>
                {editing === "summary" ? (
                  <TextInput
                    testID="copper-summary-input"
                    value={summaryDraft}
                    onChangeText={setSummaryDraft}
                    style={styles.textArea}
                    multiline
                    placeholder="Tulis deskripsi kondisi…"
                    placeholderTextColor={colors.muted}
                    autoFocus
                  />
                ) : (
                  <Text style={styles.summary}>{test.ai_summary || "Belum ada deskripsi."}</Text>
                )}
              </View>

              {/* recommendation */}
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardLabel}>REKOMENDASI</Text>
                  <EditControls section="recommendation" />
                </View>
                {editing === "recommendation" ? (
                  <TextInput
                    testID="copper-recommendation-input"
                    value={recDraft}
                    onChangeText={setRecDraft}
                    style={styles.textArea}
                    multiline
                    placeholder="Tulis rekomendasi tindakan…"
                    placeholderTextColor={colors.muted}
                    autoFocus
                  />
                ) : (
                  <Text style={[styles.summary, !test.recommendation && { color: colors.muted }]}>
                    {test.recommendation || "Belum ada rekomendasi. Tap Edit untuk menambahkan."}
                  </Text>
                )}
              </View>

              {/* test info */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>TEST INFORMATION</Text>
                <Info k="Product / Fuel" v={test.meta.product || "—"} />
                <Info k="Batch / Lot" v={test.meta.batch || "—"} />
                <Info k="Operator" v={test.meta.operator || "—"} />
                <Info k="Condition" v={`${test.meta.temperature_c}°C · ${test.meta.duration_hours}h`} />
                <Info k="Classification" v={`${test.classification.toUpperCase()} (${test.group})`} />
                <Info k="Status" v={statusLabel(test.status)} />
                <Info k="Analyzed" v={fmtDateTime(test.created_at)} />
                <Info k="AI Model" v={test.ai_model} last />
              </View>

              <Pressable style={styles.exportBtn} onPress={exportPdf} disabled={exporting} testID="copper-export-report-btn">
                <Export size={18} color={colors.onBrandSecondary} weight="bold" />
                <Text style={styles.exportText}>EXPORT PDF REPORT</Text>
              </Pressable>

              <Pressable style={styles.deleteBtn} onPress={onDelete} testID="copper-delete-test">
                <TrashSimple size={16} color={colors.error} />
                <Text style={styles.deleteText}>Hapus uji ini</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function Info({ k, v, last }: { k: string; v: string; last?: boolean }) {
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center", gap: spacing.lg },
  hIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandSecondary, letterSpacing: 1.5 },
  helper: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, lineHeight: 16, marginTop: spacing.sm },
  photo: { width: "100%", height: 240, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, marginTop: spacing.md },
  classDesc: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceSecondary, lineHeight: 18, textAlign: "center" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceTertiary,
  },
  editText: { fontFamily: fonts.monoBold, fontSize: 11, color: c.brandSecondary, letterSpacing: 0.5 },
  editActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cancelBtn: { width: 32, height: 30, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: c.brandSecondary },
  saveText: { fontFamily: fonts.monoBold, fontSize: 11, color: c.onBrandSecondary, letterSpacing: 0.5 },
  textArea: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 96,
    marginTop: spacing.sm,
    fontFamily: fonts.mono,
    fontSize: 13,
    color: c.onSurface,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  summary: { fontFamily: fonts.mono, fontSize: 13, color: c.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider, marginTop: spacing.xs },
  infoK: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary, flex: 1 },
  infoV: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurface, flex: 1, textAlign: "right" },
  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: c.brandSecondary, borderRadius: radius.md, height: 52 },
  exportText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onBrandSecondary, letterSpacing: 1 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md },
  deleteText: { fontFamily: fonts.mono, fontSize: 12, color: c.error },
  errText: { fontFamily: fonts.mono, fontSize: 13, color: c.muted, marginBottom: spacing.lg },
  backHome: { backgroundColor: c.brandSecondary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md },
  backHomeText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onBrandSecondary, letterSpacing: 1 },
}));
