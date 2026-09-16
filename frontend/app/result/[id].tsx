import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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

import { fileUrl, imageToDataUri, isClear, statusLabel, TestUpdate, useDeleteTest, useTest, useUpdateTest } from "@/src/api";
import { Header } from "@/src/components/Header";
import { KHTScale } from "@/src/components/KHTScale";
import { ParameterTable, paramRows } from "@/src/components/ParameterTable";
import { RatingGauge } from "@/src/components/RatingGauge";
import { Segmented } from "@/src/components/Segmented";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useToast } from "@/src/components/Toast";
import { TubeViewer } from "@/src/components/TubeViewer";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDateTime } from "@/src/utils/format";
import { printHtmlOnWeb } from "@/src/utils/pdf-report";

export default function Result() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: test, isLoading, isError } = useTest(id);
  const del = useDeleteTest();
  const update = useUpdateTest();
  const [mode, setMode] = useState<"original" | "heatmap">("heatmap");
  const [exporting, setExporting] = useState(false);

  type EditSection = "rating" | "summary" | "recommendation" | null;
  const [editing, setEditing] = useState<EditSection>(null);
  const [ratingDraft, setRatingDraft] = useState("");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [recDraft, setRecDraft] = useState("");

  function startEdit(section: Exclude<EditSection, null>) {
    if (!test) return;
    if (section === "rating") setRatingDraft(String(test.rating));
    if (section === "summary") setSummaryDraft(test.ai_summary || "");
    if (section === "recommendation") setRecDraft(test.recommendation || "");
    setEditing(section);
  }

  async function saveEdit() {
    if (!test || !editing) return;
    const changes: TestUpdate = {};
    if (editing === "rating") {
      const n = parseFloat(ratingDraft.replace(",", "."));
      if (isNaN(n) || n < 0 || n > 10) {
        toast("Angka color scale harus 0 – 10.", "error");
        return;
      }
      changes.rating = Math.round(n * 10) / 10;
    } else if (editing === "summary") {
      changes.ai_summary = summaryDraft.trim();
    } else if (editing === "recommendation") {
      changes.recommendation = recDraft.trim();
    }
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
          <Pressable
            style={styles.cancelBtn}
            onPress={() => setEditing(null)}
            disabled={update.isPending}
            testID={`cancel-${section}`}
          >
            <X size={15} color={colors.onSurfaceTertiary} weight="bold" />
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={saveEdit} disabled={update.isPending} testID={`save-${section}`}>
            {update.isPending ? (
              <ActivityIndicator size="small" color={colors.onBrandPrimary} />
            ) : (
              <Check size={14} color={colors.onBrandPrimary} weight="bold" />
            )}
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <Pressable style={styles.editBtn} onPress={() => startEdit(section)} testID={`edit-${section}`}>
        <PencilSimple size={13} color={colors.brandPrimary} weight="bold" />
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
    );
  }

  async function exportPdf() {
    if (!test) return;
    setExporting(true);
    try {
      // Embed the original uploaded photo as a base64 data URI so it always
      // renders inside the downloaded PDF (remote URLs can fail to load).
      const imgSrc = (await imageToDataUri(fileUrl(test.image_path))) || fileUrl(test.image_path);
      const rows = paramRows(test.parameters)
        .map((r) => `<tr><td>${r.label}</td><td style="text-align:right;font-weight:bold">${r.value}</td></tr>`)
        .join("");
      const scolor = isClear(test.status) ? "#15803D" : "#C1220E";
      const html = `
        <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>KHT Report ${test.meta.sample_id}</title>
        <style>
          @page{margin:0;size:A4}
          *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
          body{font-family:-apple-system,Helvetica,Arial;margin:0;padding:40px 32px;color:#0A1420}
          h1{color:#0A1420;margin:0} .sub{color:#00898a;font-size:12px;letter-spacing:1px}
          .rating{font-size:64px;font-weight:800;color:${scolor}}
          table{width:100%;border-collapse:collapse;margin-top:12px}
          td{padding:8px 4px;border-bottom:1px solid #e5e7eb;font-size:13px}
          .badge{display:inline-block;padding:4px 12px;border-radius:4px;color:#fff;font-weight:bold;background:${scolor}}
          .card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:16px}
          img{width:100%;border-radius:8px;margin-top:12px}
        </style></head><body>
          <div class="sub">KHT AI VISION · KOMATSU HOT TUBE TESTER</div>
          <h1>Test Report — ${test.meta.sample_id}</h1>
          <div style="margin-top:12px">
            <span class="rating">${test.rating.toFixed(1)}</span>
            <span style="font-size:20px;color:#64748b">/10</span>
            &nbsp;&nbsp;<span class="badge">${statusLabel(test.status)}</span>
            <div style="color:#64748b;font-size:13px">${test.performance} · Confidence ${test.confidence.toFixed(1)}% · ${test.deposit_level_label}</div>
          </div>
          <img src="${imgSrc}" />
          <div style="color:#64748b;font-size:11px;margin-top:4px">Original sample photo — ${test.meta.sample_id}</div>
          <div class="card"><b>Deskripsi Kondisi</b><p style="font-size:13px;color:#374151">${test.ai_summary || "-"}</p></div>
          <div class="card"><b>Rekomendasi</b><p style="font-size:13px;color:#374151">${test.recommendation || "-"}</p></div>
          <div class="card"><b>Parameter Analysis</b><table>${rows}</table></div>
          <div class="card"><b>Test Information</b><table>
            <tr><td>Product / Oil</td><td style="text-align:right">${test.meta.oil_type || "-"}</td></tr>
            <tr><td>Batch / Lot</td><td style="text-align:right">${test.meta.batch || "-"}</td></tr>
            <tr><td>Operator</td><td style="text-align:right">${test.meta.operator || "-"}</td></tr>
            <tr><td>Condition</td><td style="text-align:right">${test.meta.temperature_c}&deg;C / ${test.meta.duration_hours}h</td></tr>
            <tr><td>Air / Oil Flow</td><td style="text-align:right">${test.meta.air_flow} / ${test.meta.oil_flow} mL/min</td></tr>
            <tr><td>Analyzed</td><td style="text-align:right">${fmtDateTime(test.created_at)}</td></tr>
            <tr><td>AI Model</td><td style="text-align:right">${test.ai_model}</td></tr>
          </table></div>
        </body></html>`;

      if (Platform.OS === "web") {
        printHtmlOnWeb(html);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "KHT Test Report" });
        } else {
          toast("PDF generated.", "success");
        }
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
        showBack
        right={
          <Pressable style={styles.hIcon} onPress={exportPdf} disabled={exporting} testID="export-pdf">
            {exporting ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <Export size={20} color={colors.brandPrimary} weight="bold" />
            )}
          </Pressable>
        }
      />
      {isError ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Test record not found.</Text>
          <Pressable style={styles.backHome} onPress={() => router.replace("/")} testID="result-go-home">
            <Text style={styles.backHomeText}>BACK TO DASHBOARD</Text>
          </Pressable>
        </View>
      ) : isLoading || !test ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* tube viewer */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SAMPLE ANALYSIS</Text>
            <View style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
              <Segmented
                testID="view-mode"
                value={mode}
                onChange={setMode}
                options={[
                  { label: "Heatmap", value: "heatmap" },
                  { label: "Original", value: "original" },
                ]}
              />
            </View>
            <TubeViewer imagePath={test.image_path} parameters={test.parameters} mode={mode} />
          </View>

          {/* rating */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardLabel}>RESULT & RATING</Text>
              <View style={styles.headRight}>
                <StatusBadge status={test.status} size="sm" />
                <EditControls section="rating" />
              </View>
            </View>
            {editing === "rating" ? (
              <View style={styles.editInline}>
                <Text style={styles.editHint}>Angka Color Scale (0 – 10)</Text>
                <TextInput
                  testID="rating-input"
                  value={ratingDraft}
                  onChangeText={setRatingDraft}
                  keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                  style={styles.numInput}
                  placeholder="0 - 10"
                  placeholderTextColor={colors.muted}
                  autoFocus
                />
                <Text style={styles.editHint}>Status dihitung otomatis: CLEAR bila ≥ 7, selain itu TARNISH.</Text>
              </View>
            ) : (
              <View style={{ alignItems: "center", marginVertical: spacing.md }}>
                <RatingGauge rating={test.rating} performance={test.performance} confidence={test.confidence} />
              </View>
            )}
            <View style={styles.split}>
              <View style={styles.splitCell}>
                <Text style={styles.splitLabel}>DEPOSIT LEVEL</Text>
                <Text style={styles.splitValue}>{test.deposit_level_label || "—"}</Text>
              </View>
              <View style={[styles.splitCell, { borderLeftWidth: 1, borderLeftColor: colors.divider }]}>
                <Text style={styles.splitLabel}>STATUS</Text>
                <Text style={[styles.splitValue, { color: isClear(test.status) ? colors.success : colors.error }]}>
                  {statusLabel(test.status)}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <KHTScale current={test.rating} />
            </View>
          </View>

          {/* Deskripsi kondisi (AI summary, editable) */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardLabel}>DESKRIPSI KONDISI</Text>
              <EditControls section="summary" />
            </View>
            {editing === "summary" ? (
              <TextInput
                testID="summary-input"
                value={summaryDraft}
                onChangeText={setSummaryDraft}
                style={styles.textArea}
                multiline
                placeholder="Tulis deskripsi kondisi endapan…"
                placeholderTextColor={colors.muted}
                autoFocus
              />
            ) : (
              <Text style={styles.summary}>{test.ai_summary || "Belum ada deskripsi."}</Text>
            )}
          </View>

          {/* Rekomendasi (editable, manual) */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardLabel}>REKOMENDASI</Text>
              <EditControls section="recommendation" />
            </View>
            {editing === "recommendation" ? (
              <TextInput
                testID="recommendation-input"
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

          {/* parameters */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PARAMETER ANALYSIS</Text>
            <View style={{ marginTop: spacing.sm }}>
              <ParameterTable parameters={test.parameters} />
            </View>
          </View>

          {/* test info */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TEST INFORMATION</Text>
            <Info k="Product / Oil" v={test.meta.oil_type || "—"} />
            <Info k="Batch / Lot" v={test.meta.batch || "—"} />
            <Info k="Operator" v={test.meta.operator || "—"} />
            <Info k="Condition" v={`${test.meta.temperature_c}°C · ${test.meta.duration_hours}h`} />
            <Info k="Air / Oil Flow" v={`${test.meta.air_flow} / ${test.meta.oil_flow} mL/min`} />
            <Info k="Analyzed" v={fmtDateTime(test.created_at)} />
            <Info k="AI Model" v={test.ai_model} last />
          </View>

          <Pressable style={styles.exportBtn} onPress={exportPdf} disabled={exporting} testID="export-report-btn">
            <Export size={18} color={colors.onBrandPrimary} weight="bold" />
            <Text style={styles.exportText}>EXPORT PDF REPORT</Text>
          </Pressable>

          <Pressable style={styles.deleteBtn} onPress={onDelete} testID="delete-test">
            <TrashSimple size={16} color={colors.error} />
            <Text style={styles.deleteText}>Delete this test</Text>
          </Pressable>
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
  content: { padding: spacing.lg, gap: spacing.lg },
  hIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandPrimary, letterSpacing: 1.5 },
  headRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  editText: { fontFamily: fonts.monoBold, fontSize: 11, color: c.brandPrimary, letterSpacing: 0.5 },
  editActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cancelBtn: {
    width: 32,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceTertiary,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: c.brandPrimary,
  },
  saveText: { fontFamily: fonts.monoBold, fontSize: 11, color: c.onBrandPrimary, letterSpacing: 0.5 },
  editInline: { marginTop: spacing.md, gap: spacing.sm },
  editHint: { fontFamily: fonts.mono, fontSize: 10, color: c.muted },
  numInput: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 54,
    fontFamily: fonts.display,
    fontSize: 28,
    color: c.onSurface,
    textAlign: "center",
  },
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
  split: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.divider, marginTop: spacing.sm },
  splitCell: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  splitLabel: { fontFamily: fonts.mono, fontSize: 9, color: c.muted, letterSpacing: 1 },
  splitValue: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onSurface, marginTop: 3 },
  summary: { fontFamily: fonts.mono, fontSize: 13, color: c.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 },
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
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: c.brandPrimary,
    borderRadius: radius.md,
    height: 52,
  },
  exportText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onBrandPrimary, letterSpacing: 1 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md },
  deleteText: { fontFamily: fonts.mono, fontSize: 12, color: c.error },
  errText: { fontFamily: fonts.mono, fontSize: 13, color: c.muted, marginBottom: spacing.lg },
  backHome: {
    backgroundColor: c.brandPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  backHomeText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onBrandPrimary, letterSpacing: 1 },
}));
