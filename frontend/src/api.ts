import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

// On web, always call the API on the SAME origin that served the page. The
// preview/deploy host proxies `/api/*` to the backend, so this keeps every
// request same-origin (no CORS) even when the page is opened through an alias
// host that differs from EXPO_PUBLIC_BACKEND_URL. Native builds have no
// `window`, so they keep using the configured backend URL.
function resolveBackendUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const origin = window.location?.origin ?? "";
    if (/^https?:\/\//.test(origin) && !/localhost|127\.0\.0\.1/.test(origin)) return origin;
  }
  return process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
}

export const BACKEND_URL = resolveBackendUrl();
export const API = `${BACKEND_URL}/api`;

export function fileUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path; // seed/demo remote images
  return `${API}/files/${path}`;
}

export type Parameters = {
  deposit_area_pct: number;
  deposit_length_mm: number;
  deposit_coverage_pct: number;
  avg_intensity_l: number;
  avg_color_a: number;
  avg_color_b: number;
  max_intensity: number;
  thickness_index_mm: number;
  deposit_start_mm: number;
  deposit_end_mm: number;
};

export type TestMeta = {
  sample_id: string;
  oil_type: string;
  batch: string;
  operator: string;
  temperature_c: number;
  duration_hours: number;
  air_flow: number;
  oil_flow: number;
  remark: string;
};

export type TestRecord = {
  id: string;
  image_path: string;
  meta: TestMeta;
  rating: number;
  performance: string;
  confidence: number;
  status: string;
  deposit_level_label: string;
  parameters: Parameters;
  ai_summary: string;
  recommendation: string;
  ai_model: string;
  created_at: string;
  edited?: boolean;
  edited_at?: string | null;
};

export type DashboardData = {
  latest: TestRecord | null;
  total: number;
  passed: number;
  failed: number;
  avg_rating: number;
};

// Result status labels: CLEAR (green, rating >= 7) / TARNISH (red).
// Older records may still carry the legacy PASS/FAIL values.
export const STATUS_CLEAR = "CLEAR";
export const STATUS_TARNISH = "TARNISH";
export function isClear(status?: string | null): boolean {
  const s = (status ?? "").toUpperCase();
  return s === STATUS_CLEAR || s === "PASS";
}
export function statusLabel(status?: string | null): string {
  return isClear(status) ? STATUS_CLEAR : STATUS_TARNISH;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => getJSON<DashboardData>(`${API}/dashboard`) });
}

export function useTests(q?: string) {
  return useQuery({
    queryKey: ["tests", q ?? ""],
    queryFn: () => getJSON<TestRecord[]>(`${API}/tests${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useTest(id: string) {
  return useQuery({ queryKey: ["test", id], queryFn: () => getJSON<TestRecord>(`${API}/tests/${id}`), enabled: !!id });
}

export function useTrend() {
  return useQuery({
    queryKey: ["trend"],
    queryFn: () =>
      getJSON<{ id: string; rating: number; status: string; sample_id: string; created_at: string }[]>(`${API}/trend`),
  });
}

export type ColorScaleLevel = {
  level: number;
  color: string;
  name: string;
  condition: string;
  deposit_pct: string;
  grade: string;
  status: string;
};

export type ColorScaleData = {
  title: string;
  note: string;
  image: string; // base64 data URI
  levels: ColorScaleLevel[];
  updated_at?: string;
};

export function useColorScale() {
  return useQuery({ queryKey: ["color-scale"], queryFn: () => getJSON<ColorScaleData>(`${API}/color-scale`) });
}

// Web only: shrink very large photos (laptop/phone originals can be 10+ MB)
// before upload. The AI pipeline downsizes to 1600px anyway, so 2000px keeps
// plenty of detail while making the request far less likely to be rejected.
async function downscaleBlobOnWeb(blob: Blob, maxSide = 2000): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.max(bmp.width, bmp.height) / maxSide;
    if (scale <= 1) return blob;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width / scale);
    canvas.height = Math.round(bmp.height / scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    return out ?? blob;
  } catch {
    return blob;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
    fr.readAsDataURL(blob);
  });
}

// Fallback path: send the image as base64 JSON chunks (~300 KB each).
async function uploadInChunks(blob: Blob, ext: string): Promise<string> {
  return uploadBase64InChunks(await blobToBase64(blob), ext);
}

async function uploadBase64InChunks(b64: string, ext: string): Promise<string> {
  const CHUNK = 300 * 1024;
  const total = Math.max(1, Math.ceil(b64.length / CHUNK));
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  for (let i = 0; i < total; i++) {
    const res = await postJsonWithRetry(`${API}/upload/chunk`, {
      upload_id: uploadId,
      index: i,
      total,
      data: b64.slice(i * CHUNK, (i + 1) * CHUNK),
    });
    if (!res.ok) throw new Error(`Upload chunk ${i + 1}/${total} failed: ${res.status}`);
  }
  const fin = await postJsonWithRetry(`${API}/upload/finish`, { upload_id: uploadId, ext });
  if (!fin.ok) throw new Error(`Upload finish failed: ${fin.status} ${await fin.text()}`);
  return ((await fin.json()) as { image_path: string }).image_path;
}

export async function uploadImage(uri: string): Promise<string> {
  const clean = uri.split("?")[0].toLowerCase();
  const ext = clean.endsWith(".png") ? "png" : "jpg";
  const name = `tube_${Date.now()}.${ext}`;
  const type = ext === "png" ? "image/png" : "image/jpeg";

  if (Platform.OS === "web") {
    // Web: turn the (blob:/data:) uri into a real Blob before appending.
    let blob = await (await fetch(uri)).blob();
    blob = await downscaleBlobOnWeb(blob);
    try {
      const form = new FormData();
      form.append("file", blob, name);
      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (res.ok) return ((await res.json()) as { image_path: string }).image_path;
      if (res.status !== 413) throw new Error(`Upload failed: ${res.status}`);
    } catch (e) {
      if (!(e instanceof TypeError) && !String((e as Error)?.message).includes("413")) throw e;
      // Network-level failure ("Failed to fetch") or 413 → fall back to
      // small base64 JSON chunks which pass restrictive proxies.
    }
    return uploadInChunks(blob, ext);
  }

  // Native: React Native's FormData rejects file parts on new-architecture
  // builds ("unsupported FormData part implementation"). Use FileSystem's
  // native multipart uploader instead — it streams a real file:// path and
  // never touches the JS FormData polyfill. ImagePicker can hand back ph://
  // (iOS) or content:// (Android) uris, so copy into cache first for a valid
  // file:// path.
  let localUri = uri;
  const dest = `${FileSystem.cacheDirectory}${name}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    localUri = dest;
  } catch {
    localUri = uri;
  }
  let result: FileSystem.FileSystemUploadResult | null = null;
  try {
    result = await FileSystem.uploadAsync(`${API}/upload`, localUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: type,
    });
  } catch {
    result = null; // network-level failure → chunked fallback below
  }
  if (result && result.status >= 200 && result.status < 300) {
    return (JSON.parse(result.body) as { image_path: string }).image_path;
  }
  if (result && result.status !== 413) {
    throw new Error(`Upload failed: ${result.status} ${result.body ?? ""}`.trim());
  }
  const b64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  return uploadBase64InChunks(b64, ext);
}

// Fetch an image URL and return a base64 data URI (used to embed the original
// photo directly inside the exported PDF report).
// - Native: download to the cache dir with expo-file-system and read it back as
//   base64 (React Native's Blob/FileReader path is unreliable for large files).
// - Web: fetch -> Blob -> FileReader (unchanged, already works in browsers).
export async function imageToDataUri(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    if (Platform.OS !== "web") {
      const clean = url.split("?")[0].toLowerCase();
      const ext = clean.endsWith(".png") ? "png" : clean.endsWith(".webp") ? "webp" : "jpg";
      const dest = `${FileSystem.cacheDirectory}pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const dl = await FileSystem.downloadAsync(url, dest);
      if (dl.status < 200 || dl.status >= 300) return null;
      const mime =
        (dl.headers?.["Content-Type"] || dl.headers?.["content-type"] || "").split(";")[0].trim() ||
        (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
      const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
      FileSystem.deleteAsync(dl.uri, { idempotent: true }).catch(() => {});
      return `data:${mime};base64,${b64}`;
    }
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type AnalyzePayload = Partial<TestMeta> & { image_path: string };

type AnalyzeJob = { id: string; status: "running" | "done" | "error"; record_id?: string | null; error?: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJsonWithRetry(url: string, body: unknown, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      // "Failed to fetch" / network hiccup — back off and retry.
      lastErr = e;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error(`Tidak bisa terhubung ke server (${(lastErr as Error)?.message ?? "network"}). Periksa koneksi lalu coba lagi.`);
}

// Gemini can take longer than the proxy's 60s request limit, so the backend
// runs the analysis as a job and we poll for the result (up to ~6 minutes).
export async function analyzeWithPolling(payload: AnalyzePayload, onTick?: (elapsedSec: number) => void) {
  const startRes = await postJsonWithRetry(`${API}/analyze/start`, payload);
  if (!startRes.ok) {
    const t = await startRes.text();
    throw new Error(t || `Analysis failed: ${startRes.status}`);
  }
  const job = (await startRes.json()) as AnalyzeJob;
  const started = Date.now();
  const deadline = started + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(2500);
    onTick?.(Math.round((Date.now() - started) / 1000));
    let st: AnalyzeJob | null = null;
    try {
      const r = await fetch(`${API}/analyze/jobs/${job.id}`);
      if (r.ok) st = (await r.json()) as AnalyzeJob;
    } catch {
      // transient network error — keep polling
    }
    if (!st) continue;
    if (st.status === "done" && st.record_id) {
      return getJSON<TestRecord>(`${API}/tests/${st.record_id}`);
    }
    if (st.status === "error") throw new Error(st.error || "AI Vision analysis failed.");
  }
  throw new Error("Analisa AI memakan waktu terlalu lama. Coba lagi dengan foto yang lebih kecil.");
}

export function useAnalyze(onTick?: (elapsedSec: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnalyzePayload) => analyzeWithPolling(payload, onTick),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["trend"] });
    },
  });
}

export function useDeleteTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/tests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["trend"] });
    },
  });
}

export type TestUpdate = Partial<{
  rating: number;
  performance: string;
  status: string;
  deposit_level_label: string;
  ai_summary: string;
  recommendation: string;
}>;

export function useUpdateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: TestUpdate }) => {
      const res = await fetch(`${API}/tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Update failed: ${res.status}`);
      }
      return (await res.json()) as TestRecord;
    },
    onSuccess: (data) => {
      qc.setQueryData(["test", data.id], data);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["trend"] });
    },
  });
}

// ===========================================================================
// MODULE: Copper Strip Corrosion — ASTM D130 / IP 154
// ===========================================================================
export type CopperMeta = {
  sample_id: string;
  product: string;
  batch: string;
  operator: string;
  temperature_c: number;
  duration_hours: number;
  remark: string;
};

export type CopperRecord = {
  id: string;
  image_path: string;
  meta: CopperMeta;
  classification: string;
  class_label: string;
  group: string;
  color: string;
  description: string;
  severity: number;
  confidence: number;
  status: string;
  ai_summary: string;
  recommendation: string;
  ai_model: string;
  created_at: string;
  edited?: boolean;
  edited_at?: string | null;
};

export type CopperClass = {
  code: string;
  label: string;
  group: string;
  color: string;
  description: string;
  severity: number;
  status: string;
};

export type CopperDashboardData = {
  latest: CopperRecord | null;
  total: number;
  passed: number;
  failed: number;
};

export type CopperScaleData = {
  title: string;
  note: string;
  image: string; // base64 data URI
  classes: CopperClass[];
  updated_at?: string;
};

export type CopperTrendPoint = {
  id: string;
  classification: string;
  severity: number;
  status: string;
  sample_id: string;
  created_at: string;
};

export function useCopperDashboard() {
  return useQuery({
    queryKey: ["copper-dashboard"],
    queryFn: () => getJSON<CopperDashboardData>(`${API}/copper/dashboard`),
  });
}

export function useCopperTests(q?: string) {
  return useQuery({
    queryKey: ["copper-tests", q ?? ""],
    queryFn: () => getJSON<CopperRecord[]>(`${API}/copper/tests${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function useCopperTest(id: string) {
  return useQuery({
    queryKey: ["copper-test", id],
    queryFn: () => getJSON<CopperRecord>(`${API}/copper/tests/${id}`),
    enabled: !!id,
  });
}

export function useCopperTrend() {
  return useQuery({
    queryKey: ["copper-trend"],
    queryFn: () => getJSON<CopperTrendPoint[]>(`${API}/copper/trend`),
  });
}

export function useCopperScale() {
  return useQuery({ queryKey: ["copper-scale"], queryFn: () => getJSON<CopperScaleData>(`${API}/copper/reference-scale`) });
}

export type CopperAnalyzePayload = Partial<CopperMeta> & { image_path: string };

export async function analyzeCopperWithPolling(payload: CopperAnalyzePayload, onTick?: (elapsedSec: number) => void) {
  const startRes = await postJsonWithRetry(`${API}/copper/analyze/start`, payload);
  if (!startRes.ok) {
    const t = await startRes.text();
    throw new Error(t || `Analysis failed: ${startRes.status}`);
  }
  const job = (await startRes.json()) as AnalyzeJob;
  const started = Date.now();
  const deadline = started + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(2500);
    onTick?.(Math.round((Date.now() - started) / 1000));
    let st: AnalyzeJob | null = null;
    try {
      const r = await fetch(`${API}/copper/analyze/jobs/${job.id}`);
      if (r.ok) st = (await r.json()) as AnalyzeJob;
    } catch {
      // transient network error — keep polling
    }
    if (!st) continue;
    if (st.status === "done" && st.record_id) {
      return getJSON<CopperRecord>(`${API}/copper/tests/${st.record_id}`);
    }
    if (st.status === "error") throw new Error(st.error || "AI Vision analysis failed.");
  }
  throw new Error("Analisa AI memakan waktu terlalu lama. Coba lagi dengan foto yang lebih kecil.");
}

function invalidateCopper(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["copper-dashboard"] });
  qc.invalidateQueries({ queryKey: ["copper-tests"] });
  qc.invalidateQueries({ queryKey: ["copper-trend"] });
}

export function useAnalyzeCopper(onTick?: (elapsedSec: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CopperAnalyzePayload) => analyzeCopperWithPolling(payload, onTick),
    onSuccess: () => invalidateCopper(qc),
  });
}

export function useDeleteCopperTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/copper/tests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => invalidateCopper(qc),
  });
}

export type CopperUpdate = Partial<{
  classification: string;
  status: string;
  ai_summary: string;
  recommendation: string;
}>;

export function useUpdateCopperTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: CopperUpdate }) => {
      const res = await fetch(`${API}/copper/tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Update failed: ${res.status}`);
      }
      return (await res.json()) as CopperRecord;
    },
    onSuccess: (data) => {
      qc.setQueryData(["copper-test", data.id], data);
      invalidateCopper(qc);
    },
  });
}
