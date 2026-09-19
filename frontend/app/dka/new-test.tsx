import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, ImageSquare, Lightbulb, Sparkle } from "phosphor-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DkaAnalyzePayload, uploadImage, useAnalyzeDka } from "@/src/api";
import { CameraCapture } from "@/src/components/CameraCapture";
import { Header } from "@/src/components/Header";
import { useToast } from "@/src/components/Toast";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

function defaultBatchId() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const rnd = String(Math.floor(Math.random() * 900) + 100);
  return `DKA-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${rnd}`;
}

export default function DkaNewTest() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const analyze = useAnalyzeDka((sec) => setStage(`Deteksi 4 tabung & OCR… ${sec}s`));

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  const [batchId, setBatchId] = useState(defaultBatchId());
  const [product, setProduct] = useState("Engine Oil SAE 15W-40");
  const [operator, setOperator] = useState("");
  const [temperature, setTemperature] = useState("320");
  const [duration, setDuration] = useState("16");
  const [remark, setRemark] = useState("");

  async function pickImage(source: "camera" | "gallery") {
    if (source === "camera") {
      setShowCamera(true);
      return;
    }
    try {
      const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
      let status = cur.status;
      if (status !== "granted" && cur.canAskAgain) {
        status = (await ImagePicker.requestMediaLibraryPermissionsAsync()).status;
      }
      if (status !== "granted") {
        toast("Izin galeri diperlukan. Aktifkan di Pengaturan.", "error");
        Linking.openSettings?.();
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (!res.canceled) setImageUri(res.assets[0].uri);
    } catch {
      toast("Tidak bisa membuka sumber gambar.", "error");
    }
  }

  async function runAnalysis() {
    if (!imageUri) {
      toast("Ambil atau unggah foto batch (maks 4 tabung) dulu.", "error");
      return;
    }
    setBusy(true);
    let step = "Upload foto";
    try {
      setStage("Uploading image…");
      const path = await uploadImage(imageUri);
      step = "Analisa AI";
      setStage("Deteksi tabung & OCR label…");
      const payload: DkaAnalyzePayload = {
        image_path: path,
        batch_id: batchId,
        product,
        operator,
        temperature_c: Number(temperature) || 320,
        duration_hours: Number(duration) || 16,
        remark,
      };
      const result = await analyze.mutateAsync(payload);
      toast(`Analisa selesai — ${result.samples.length} sampel terdeteksi`, "success");
      setImageUri(null);
      setBatchId(defaultBatchId());
      router.push(`/dka-result/${result.id}`);
    } catch (e: any) {
      const msg = e?.message ? String(e.message).slice(0, 110) : "AI analysis failed.";
      toast(`${step} gagal: ${msg}`, "error");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <View style={styles.screen}>
      <Header title="New Batch" subtitle="DKA · maks 4 tabung / foto" logo="DKA" showBack />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bottomOffset={100}>
        <View style={styles.inner}>
          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
              <View style={styles.previewActions}>
                <Pressable style={styles.smallBtn} onPress={() => pickImage("camera")} testID="dka-retake-camera">
                  <Camera size={16} color={colors.onSurface} />
                  <Text style={styles.smallBtnText}>Retake</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={() => pickImage("gallery")} testID="dka-change-gallery">
                  <ImageSquare size={16} color={colors.onSurface} />
                  <Text style={styles.smallBtnText}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.pickBox}>
              <Text style={styles.pickHint}>Foto hingga 4 tabung berjajar (resolusi tinggi)</Text>
              <View style={styles.pickRow}>
                <Pressable style={styles.pickBtn} onPress={() => pickImage("camera")} testID="dka-pick-camera">
                  <Camera size={26} color={colors.info} weight="fill" />
                  <Text style={styles.pickBtnText}>CAMERA</Text>
                </Pressable>
                <Pressable style={styles.pickBtn} onPress={() => pickImage("gallery")} testID="dka-pick-gallery">
                  <ImageSquare size={26} color={colors.info} weight="fill" />
                  <Text style={styles.pickBtnText}>GALLERY</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.tipBox}>
            <Lightbulb size={18} color={colors.warning} weight="fill" />
            <Text style={styles.tipText}>
              Agar OCR label tulisan tangan akurat: pencahayaan terang & merata (tanpa bayangan), label menghadap tepat ke kamera, dan lensa bersih agar tidak buram.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>BATCH INFORMATION</Text>
          <Field label="Batch ID" value={batchId} onChangeText={setBatchId} testID="dka-input-batch-id" />
          <Field label="Product / Oil" value={product} onChangeText={setProduct} testID="dka-input-product" />
          <Field label="Operator" value={operator} onChangeText={setOperator} placeholder="Nama" testID="dka-input-operator" />

          <Text style={styles.sectionLabel}>TEST CONDITION</Text>
          <View style={styles.gridRow}>
            <Field label="Temp (°C)" value={temperature} onChangeText={setTemperature} numeric half testID="dka-input-temp" />
            <Field label="Duration (h)" value={duration} onChangeText={setDuration} numeric half testID="dka-input-duration" />
          </View>
          <Field label="Remark" value={remark} onChangeText={setRemark} placeholder="Opsional" testID="dka-input-remark" />
          <View style={{ height: spacing.xl }} />
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable style={[styles.runBtn, (!imageUri || busy) && styles.runBtnDisabled]} onPress={runAnalysis} disabled={busy} testID="dka-run-analysis">
            {busy ? (
              <>
                <ActivityIndicator color={colors.onInfo} />
                <Text style={styles.runBtnText}>{stage || "PROCESSING…"}</Text>
              </>
            ) : (
              <>
                <Sparkle size={18} color={colors.onInfo} weight="fill" />
                <Text style={styles.runBtnText}>RUN BATCH AI VISION</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardStickyView>

      <CameraCapture
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(asset) => {
          setShowCamera(false);
          setImageUri(asset.uri);
        }}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  numeric,
  half,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  numeric?: boolean;
  half?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.field, half && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={numeric ? (Platform.OS === "ios" ? "decimal-pad" : "numeric") : "default"}
        style={styles.input}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  inner: { width: "100%", maxWidth: 760, alignSelf: "center", gap: spacing.md },
  pickBox: { borderWidth: 1, borderColor: c.borderStrong, borderStyle: "dashed", borderRadius: radius.lg, backgroundColor: c.surfaceSecondary, padding: spacing.xl, alignItems: "center", gap: spacing.lg },
  pickHint: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary, textAlign: "center" },
  pickRow: { flexDirection: "row", gap: spacing.md },
  pickBtn: { backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, alignItems: "center", gap: spacing.sm, minWidth: 120 },
  pickBtnText: { fontFamily: fonts.monoBold, fontSize: 12, color: c.onSurface, letterSpacing: 1 },
  previewWrap: { borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: c.info },
  preview: { width: "100%", height: 200, backgroundColor: c.surfaceTertiary },
  previewActions: { flexDirection: "row", gap: spacing.sm, padding: spacing.sm, backgroundColor: c.surfaceSecondary },
  smallBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: c.surfaceTertiary, borderRadius: radius.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: c.border },
  smallBtnText: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurface },
  tipBox: { flexDirection: "row", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, alignItems: "flex-start" },
  tipText: { flex: 1, fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceSecondary, lineHeight: 17 },
  sectionLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.info, letterSpacing: 1.5, marginTop: spacing.md },
  gridRow: { flexDirection: "row", gap: spacing.md },
  field: { gap: spacing.xs },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary },
  input: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 46, fontFamily: fonts.monoMedium, fontSize: 14, color: c.onSurface },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderTopColor: c.border },
  runBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: c.info, borderRadius: radius.md, height: 54, width: "100%", maxWidth: 760, alignSelf: "center" },
  runBtnDisabled: { opacity: 0.5 },
  runBtnText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onInfo, letterSpacing: 1 },
}));
