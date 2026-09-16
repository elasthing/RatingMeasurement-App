import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, Crop, ImageSquare, Sparkle } from "phosphor-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnalyzePayload, uploadImage, useAnalyze } from "@/src/api";
import { CameraCapture } from "@/src/components/CameraCapture";
import { CropEditor } from "@/src/components/CropEditor";
import { Header } from "@/src/components/Header";
import { useToast } from "@/src/components/Toast";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

function defaultSampleId() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const rnd = String(Math.floor(Math.random() * 900) + 100);
  return `KHT-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${rnd}`;
}

export default function NewTest() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const analyze = useAnalyze((sec) => setStage(`Running AI Vision analysis… ${sec}s`));

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<{ uri: string; width?: number; height?: number } | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  const [sampleId, setSampleId] = useState(defaultSampleId());
  const [oilType, setOilType] = useState("Engine Oil SAE 15W-40");
  const [batch, setBatch] = useState("");
  const [operator, setOperator] = useState("");
  const [temperature, setTemperature] = useState("320");
  const [duration, setDuration] = useState("16");
  const [airFlow, setAirFlow] = useState("10");
  const [oilFlow, setOilFlow] = useState("0.31");
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
        toast("Photo library permission needed. Enable it in Settings.", "error");
        Linking.openSettings?.();
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (!res.canceled) openCropper(res.assets[0]);
    } catch {
      toast("Could not open image source.", "error");
    }
  }

  function openCropper(asset: { uri: string; width?: number; height?: number }) {
    setRawImage({ uri: asset.uri, width: asset.width, height: asset.height });
    setShowCrop(true);
  }


  async function runAnalysis() {
    if (!imageUri) {
      toast("Capture or upload a tube photo first.", "error");
      return;
    }
    setBusy(true);
    let step = "Upload foto";
    try {
      setStage("Uploading image…");
      const path = await uploadImage(imageUri);
      step = "Analisa AI";
      setStage("Running AI Vision segmentation…");
      const payload: AnalyzePayload = {
        image_path: path,
        sample_id: sampleId,
        oil_type: oilType,
        batch,
        operator,
        temperature_c: Number(temperature) || 320,
        duration_hours: Number(duration) || 16,
        air_flow: Number(airFlow) || 10,
        oil_flow: Number(oilFlow) || 0.31,
        remark,
      };
      const result = await analyze.mutateAsync(payload);
      toast("Analysis complete", "success");
      setImageUri(null);
      setSampleId(defaultSampleId());
      router.push(`/result/${result.id}`);
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
      <Header title="New Test" subtitle="AI Vision analysis" showSettings />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bottomOffset={100}
      >
        {/* image */}
        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
            <View style={styles.cropTag}>
              <Crop size={11} color={colors.onBrandPrimary} weight="bold" />
              <Text style={styles.cropTagText}>CROPPED FOR AI</Text>
            </View>
            <View style={styles.previewActions}>
              <Pressable
                style={styles.smallBtn}
                onPress={() => rawImage && setShowCrop(true)}
                testID="recrop"
              >
                <Crop size={16} color={colors.onSurface} />
                <Text style={styles.smallBtnText}>Crop</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => pickImage("camera")} testID="retake-camera">
                <Camera size={16} color={colors.onSurface} />
                <Text style={styles.smallBtnText}>Retake</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => pickImage("gallery")} testID="change-gallery">
                <ImageSquare size={16} color={colors.onSurface} />
                <Text style={styles.smallBtnText}>Change</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.pickBox}>
            <Text style={styles.pickHint}>Capture or upload the hot tube photo</Text>
            <View style={styles.pickRow}>
              <Pressable style={styles.pickBtn} onPress={() => pickImage("camera")} testID="pick-camera">
                <Camera size={26} color={colors.brandPrimary} weight="fill" />
                <Text style={styles.pickBtnText}>CAMERA</Text>
              </Pressable>
              <Pressable style={styles.pickBtn} onPress={() => pickImage("gallery")} testID="pick-gallery">
                <ImageSquare size={26} color={colors.brandPrimary} weight="fill" />
                <Text style={styles.pickBtnText}>GALLERY</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* metadata */}
        <Text style={styles.sectionLabel}>SAMPLE INFORMATION</Text>
        <Field label="Sample ID" value={sampleId} onChangeText={setSampleId} testID="input-sample-id" />
        <Field label="Product / Oil Type" value={oilType} onChangeText={setOilType} testID="input-oil-type" />
        <Field label="Batch / Lot No." value={batch} onChangeText={setBatch} placeholder="LOT-…" testID="input-batch" />
        <Field label="Operator" value={operator} onChangeText={setOperator} placeholder="Name" testID="input-operator" />

        <Text style={styles.sectionLabel}>TEST CONDITION</Text>
        <View style={styles.grid}>
          <Field label="Temp (°C)" value={temperature} onChangeText={setTemperature} numeric half testID="input-temp" />
          <Field label="Duration (h)" value={duration} onChangeText={setDuration} numeric half testID="input-duration" />
        </View>
        <View style={styles.grid}>
          <Field label="Air Flow (mL/min)" value={airFlow} onChangeText={setAirFlow} numeric half testID="input-air" />
          <Field label="Oil Flow (mL/min)" value={oilFlow} onChangeText={setOilFlow} numeric half testID="input-oil" />
        </View>
        <Field label="Remark" value={remark} onChangeText={setRemark} placeholder="Optional" testID="input-remark" />
        <View style={{ height: spacing.xl }} />
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            style={[styles.runBtn, (!imageUri || busy) && styles.runBtnDisabled]}
            onPress={runAnalysis}
            disabled={busy}
            testID="run-analysis"
          >
            {busy ? (
              <>
                <ActivityIndicator color={colors.onBrandPrimary} />
                <Text style={styles.runBtnText}>{stage || "PROCESSING…"}</Text>
              </>
            ) : (
              <>
                <Sparkle size={18} color={colors.onBrandPrimary} weight="fill" />
                <Text style={styles.runBtnText}>RUN AI VISION ANALYSIS</Text>
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
          openCropper(asset);
        }}
      />

      <CropEditor
        visible={showCrop}
        uri={rawImage?.uri ?? null}
        originalWidth={rawImage?.width}
        originalHeight={rawImage?.height}
        onCancel={() => setShowCrop(false)}
        onDone={(uri) => {
          setImageUri(uri);
          setShowCrop(false);
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
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  pickBox: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
  },
  pickHint: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceTertiary, textAlign: "center" },
  pickRow: { flexDirection: "row", gap: spacing.md },
  pickBtn: {
    backgroundColor: c.surfaceTertiary,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 120,
  },
  pickBtnText: { fontFamily: fonts.monoBold, fontSize: 12, color: c.onSurface, letterSpacing: 1 },

  previewWrap: { borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: c.brandPrimary },
  preview: { width: "100%", height: 180, backgroundColor: c.surfaceTertiary },
  cropTag: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.brandPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  cropTagText: { fontFamily: fonts.monoBold, fontSize: 9, color: c.onBrandPrimary, letterSpacing: 1 },
  previewActions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: c.surfaceSecondary,
  },
  smallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  smallBtnText: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurface },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: c.brandPrimary,
    letterSpacing: 1.5,
    marginTop: spacing.md,
  },
  grid: { flexDirection: "row", gap: spacing.md },
  field: { gap: spacing.xs },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    color: c.onSurface,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: c.brandPrimary,
    borderRadius: radius.md,
    height: 54,
  },
  runBtnDisabled: { opacity: 0.5 },
  runBtnText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onBrandPrimary, letterSpacing: 1 },
}));
