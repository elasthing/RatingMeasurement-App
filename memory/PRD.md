# KHT AI VISION — Product Requirements Document

## Original Problem Statement
"buatkan aplikasi rating alat Komatsu hot tube tester dengan feature AI VISION yang canggih dan otomatis dengan feature seperti pada gambar sehingga memudahkan hasil data analisa dan report hasil uji test."
(Build a mobile rating app for the Komatsu Hot Tube Tester with an advanced automatic AI Vision feature — like the reference dashboard image — to ease data analysis and reporting of test results.)

## User Choices
- AI Vision: REAL AI using **Gemini 3.1 Pro Vision** (`gemini-3.1-pro-preview`) via Emergent LLM key.
- Image input: **Camera + Gallery**.
- Auth: **None** (opens directly to app).
- Storage: **MongoDB** for records + **Emergent Managed Object Storage** for tube photos.
- Reporting: **In-app summary + PDF export**.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB (motor). Object storage handshake (`init/put/get`). Gemini vision via `emergentintegrations`. All routes prefixed `/api`.
- **Frontend**: Expo Router (file-based), React Query for data, dark industrial theme in `src/theme.ts`, Barlow Condensed + JetBrains Mono fonts, phosphor icons, react-native-svg gauges/charts, expo-image-picker, expo-print/sharing.
- Navigation: bottom tabs — Dashboard, New Test, History, Trend + Settings modal + Result stack screen.

## User Personas
- **Lab operator / technician**: runs hot-tube deposit tests, needs quick objective rating and a shareable report.
- **QA / lubricant engineer**: reviews history and rating trends across batches.

## Core Requirements (static)
1. Capture/upload a glass tube photo and get an automatic 0–10 KHT deposit rating with PASS/FAIL.
2. Show AI parameters (deposit area %, length mm, coverage %, L*/a*/b*, max intensity, thickness index).
3. KHT standard rating reference scale (10→0-1 color bands).
4. History with search + Pass/Fail filter; per-test detail with heatmap/original tube viewer.
5. Rating trend chart over time.
6. Export a formatted PDF report and share.

## Implemented (2026-06-09)- Backend endpoints: `/api/dashboard`, `/api/tests` (+search), `/api/tests/{id}`, `/api/analyze`, `/api/upload`, `/api/files/{path}`, `/api/trend`, `DELETE /api/tests/{id}` (soft delete). 13/13 backend tests passing.
- Real Gemini 3.1 Pro vision analysis pipeline (upload → object storage → base64 → structured JSON → persist).
- 4 auto-seeded demo records (ratings 8.7, 6.2, 9.4, 4.1).
- Dashboard (rating gauge, PASS badge, KHT scale, stats, parameter table, test info, full reference).
- New Test (camera/gallery with permission handling, metadata form, sticky analyze CTA, keyboard-aware).
- Result screen (heatmap/original tube viewer w/ mm ruler, gauge, parameters, PDF export, delete).
- History (search + Pass/Fail chips + record rows).
- Trend (SVG line chart with PASS threshold + data-point list).
- Settings modal (default conditions, model info, KHT reference detail).

### Update (2026-06-10)
- Native upload fix: `uploadImage` uses `FileSystem.uploadAsync` (multipart) on native (fixes "unsupported FormData part implementation" on device); web keeps FormData+Blob.
- PDF report now embeds the ORIGINAL uploaded photo as a base64 data URI (via `imageToDataUri`).
- **Manual Crop editor** (`src/components/CropEditor.tsx`): after picking a photo, a full-screen editor with a draggable/resizable crop box (corner handles + rule-of-thirds) lets the operator frame only the tube and ignore glare/background. Only the cropped JPEG (expo-image-manipulator) is uploaded to the AI. "Use Full Image" and re-crop supported. Verified (16/16 backend, code review OK).

### Update (2026-06-11)
- **Custom camera** (`src/components/CameraCapture.tsx`, expo-camera): full-screen preview (correct aspect, no forced zoom), pinch-to-zoom + −/+ zoom bar with `x` indicator, flip, flash, full permission handling; shutter captures at `quality:1` (high-res). New Test "CAMERA" opens this instead of the OS camera.
- Crop output raised to `compress:0.95` and gallery picker to `quality:1` for high-resolution detail.
- AI prompt updated: rates ONLY the cropped region, ignores glare/background, and returns `summary` as a short **Bahasa Indonesia** justification citing deposit severity + location (e.g. "Endapan menengah di tengah tabung memicu rating 5.5."). Verified 16/16 backend + render checks.

## Backlog / Remaining
- **P1**: Live camera preview / IP-webcam capture mode; auto-crop tube ROI before analysis.
- **P1**: Side-by-side Original vs Heatmap comparison view.
- **P2**: Export raw data as CSV/Excel; batch export of multiple reports.
- **P2**: Per-operator dashboards and multi-device sync; calibration reference-sample workflow.
- **P2**: Filter/sort history by oil type, date range, rating band.

### Update (imported into new env + fixes/features)
- Reconstructed protected `.env` files (backend: MONGO_URL/DB_NAME/EMERGENT_LLM_KEY/INTEGRATION_PROXY_URL; frontend: EXPO_PUBLIC_BACKEND_URL + packager vars). App runs; verified.
- **Bug fix — Safari "Load failed"**: CORS middleware used `allow_origins=["*"]` + `allow_credentials=True`, producing an illegal ACAO `*` + ACAC `true` on actual responses that Safari/WebKit rejects. Changed to `allow_origin_regex=".*"` + `allow_credentials=True` (origin reflected). Verified 14/14.
- **New feature — Nikko Color Scale**:
  - Backend stores the official Nikko COLOR SCALE board photo (base64 JPEG) + 11-level metadata (0-10) in MongoDB (`reference` collection, key `nikko_color_scale`, idempotent seed). New endpoint `GET /api/color-scale`.
  - Convention confirmed with user: **0 = darkest/heaviest deposit (worst, FAIL)** … **10 = clear (best, PASS)**; PASS when rating >= 7 (unchanged logic).
  - AI pipeline now sends TWO images to Gemini (Nikko reference board FIRST + sample SECOND) so it truly compares against the standard (previously only the sample was sent).
  - Frontend: new screen `app/color-scale.tsx` (board image from DB + 0-10 level legend with swatches/condition/PASS-FAIL), reachable via entry cards on Dashboard and Settings (bottom bar stays 4 tabs). Backend verified.
  - Per user: NO separate "senior technician recommendation" section was added.

### Update — Combined PDF export (History & Data)
- Every row on the History & Data tab now shows a **checkbox** (always visible). Tapping it selects the sample; header ✕ cancels; "Pilih Semua" chip toggles all; long-press also selects.
- Floating action bar → **EXPORT PDF** builds ONE integrated PDF via `src/utils/pdf-report.ts`: page 1 = cover (title, generated date, Total/Pass/Fail/Avg stats, summary table of all samples), then exactly one page per selected sample (photo embedded as base64, rating, status, description, recommendation, parameters, test info). Verified: 4 samples → 5-page PDF.
- Native: `expo-print` → share sheet; Web: isolated iframe print dialog (save as PDF).

### Bug fix — "Run AI Vision Analysis" failed
- Root cause: ingress proxy returns 502 after 60s; Gemini 3.1 Pro took >100s on full-res photos.
- Fix: image downscaled to max 1600px before Gemini; NEW async flow `POST /api/analyze/start` → `GET /api/analyze/jobs/{id}` (Mongo `analyze_jobs`), frontend polls every 2.5s (≤6 min) and shows elapsed seconds. Verified 24/24 backend tests via external URL (job ~25-45s).

- Follow-up ("Failed to fetch" on laptop Chrome): added chunked base64 JSON upload fallback (`POST /api/upload/chunk` + `/api/upload/finish`) used automatically when multipart upload fails at network level or with 413 (web + native); web downsizes to 2000px before upload; JSON POSTs retry 3x. Verified 30/30 backend + Playwright with multipart blocked.

## Next Tasks
- Gather user feedback on rating accuracy vs their standard reference samples.
- Consider a "reference calibration" flow so the AI can be tuned to a lab's known-good tubes.
- Deployment health check PASS: generated frontend/yarn.lock (removed package-lock.json), un-ignored .env in .gitignore, bundled Barlow Condensed + JetBrains Mono fonts in frontend/assets/fonts (loaded via require, no CDN).

## Bug fix (Sep 2026): Upload foto "Failed to fetch"
- Root cause: browser page origin ≠ EXPO_PUBLIC_BACKEND_URL host (cross-origin), dan edge proxy menulis ulang header Origin sehingga ACAO yang di-reflect backend tidak cocok → browser memblokir POST /api/upload dan preflight chunk.
- Fix: (1) frontend web memakai `window.location.origin` sebagai base API (same-origin, tanpa CORS); (2) backend CORS `allow_origins=["*"]`, `allow_credentials=False`.

## Relabel status (Sep 2026): PASS -> CLEAR, FAIL -> TARNISH
- Backend: konstanta STATUS_CLEAR/STATUS_TARNISH, `normalize_status()` (menerima legacy PASS/FAIL dari AI/klien), prompt AI, NIKKO_LEVELS, seed, dashboard; migrasi otomatis saat startup (`update_many` PASS→CLEAR, FAIL→TARNISH).
- Frontend: helper `isClear()/statusLabel()` di src/api.ts dipakai StatusBadge, Dashboard stat, History filter (Clear/Tarnish), Result detail, PDF single & combined (pdf-report.ts), TrendChart label.
- Warna dipertahankan: CLEAR hijau (colors.success/#15803D), TARNISH merah (colors.error/#C1220E). Grade performa (EXCELLENT…FAILED) tidak diubah.

## Bug fix (Sep 2026): URL di footer PDF
- Root cause: browser menambahkan header/footer cetak (URL halaman, judul, tanggal) di area margin saat window.print().
- Fix: `@page { margin: 0; size: A4 }` di HTML laporan tunggal (result/[id].tsx) & gabungan (pdf-report.ts), padding dipindah ke body/.page/.cover, <title> laporan ditambahkan; Result screen memakai printHtmlOnWeb bersama. Diverifikasi testing agent (iteration_8).

## Fix (Sep 2026): Ekspor PDF di HP
- `imageToDataUri` (src/api.ts): native → FileSystem.downloadAsync ke cache + readAsStringAsync base64 (RN Blob/FileReader tidak andal); web tetap fetch→Blob→FileReader.
- result/[id].tsx: toast error ekspor menampilkan e.message asli ("Export PDF gagal: …"); Sharing menambah UTI com.adobe.pdf (result & history).
- Web path diverifikasi tidak berubah (iframe HTML: data:image ada, @page ada, tanpa URL).

## Fix (Sep 2026): Share PDF di HP "Not allowed to read file under given URL"
- Helper baru `sharePdfNative(html, fileName, dialogTitle)` di src/utils/pdf-report.ts: printToFileAsync → salin ke documentDirectory dengan nama `KHT_Report_<sampleId>_<tgl>.pdf` / `KHT_Combined_Report_<n>samples_<tgl>.pdf` → pastikan prefix file:// → getInfoAsync → Sharing.shareAsync (mimeType pdf, UTI com.adobe.pdf).
- Dipakai oleh result/[id].tsx dan (tabs)/history.tsx (import expo-print/expo-sharing dipindah ke helper). Web path (printHtmlOnWeb) tidak berubah; diverifikasi ulang via Playwright.
- Belum diuji di perangkat asli (perlu Expo Go / build).

## Deployment health check (Sep 2026): PASS
- Fixed: frontend/yarn.lock dibuat (package-lock.json dihapus, repo memakai yarn); pola .env dihapus dari root .gitignore agar env tersedia di deploy context. Lint warnings dibersihkan.

## Fix v2 (Sep 2026): Share PDF di HP (Expo Go Android)
- Root cause: expo-print menulis PDF ke cacheDir host (Expo Go) di luar scoped dir → FilePermission scoped menolak READ, sehingga shareAsync DAN copyAsync gagal (fallback sebelumnya diam-diam memakai uri asli).
- Fix: `printToFileAsync({ base64: true })` → `writeAsStringAsync(documentDirectory/<nama>.pdf, base64)` → shareAsync dari documentDirectory. Tidak pernah membaca path terbatas.

## Major update (Jun 2026): Multi-modul (Web & Mobile) + Copper Strip ASTM D130
Aplikasi diubah menjadi suite dua modul dengan Beranda pemilih modul.
- **Navigasi**: `app/index.tsx` = Beranda (2 kartu modul: K-HTT ANALYST & Copper Strip ASTM D130). Tab KHT lama dipindah dari `app/(tabs)` → `app/kht/*` (rute `/kht`). Modul baru `app/copper/*` (rute `/copper`) dengan tab Dashboard/New Test/History/Trend. Result: `/result/[id]` (KHT) & `/copper-result/[id]` (Copper). Referensi: `/color-scale` (Nikko) & `/copper-scale` (ASTM D130). Root Stack di `_layout.tsx` didaftarkan ulang.
- **Backend Copper (server.py)**: koleksi Mongo baru `copper_tests` + `copper_jobs`. Metadata 13 kelas `ASTM_D130_CLASSES` (0/Freshly Polished, 1a-1b Slight, 2a-3a Moderate, 3b-3c Dark, 4a-4c Corrosion) + severity 0-12. CLEAR (lulus) = {0,1a,1b}, sisanya TARNISH. Chart standar ASTM D130/IP 154 di-generate dengan PIL (`generate_copper_reference`) lalu di-seed ke `reference` (key `astm_d130_scale`). AI Vision reuse Gemini (`gemini-3.1-pro-preview`) via Emergent LLM key — kirim chart standar + foto sampel, output JSON {classification, confidence, status, summary(ID), recommendation(ID)}.
- **Endpoint**: `/api/copper/{dashboard,tests(+q),tests/{id} GET/PUT/DELETE,trend,reference-scale,analyze/start,analyze/jobs/{id}}`. PUT untuk koreksi kelas manual (recompute group/color/severity/status). Upload reuse `/api/upload`(+chunk). 4 demo copper record di-seed (1a/1b/2c/4b).
- **Frontend Copper**: aksen warna amber (brandSecondary). Komponen baru: `CopperClassGauge`, `CopperHistoryCard`, `CopperTrendChart`, `CopperClassPicker`. PDF via `src/utils/copper-pdf.ts` (single + combined, `@page{margin:0}` → tanpa URL footer; native pakai `sharePdfNative` expo-file-system yg sama). New Test: Camera + Gallery + Crop (IP WebCam DITUNDA per user). Result: koreksi kelas manual + edit deskripsi/rekomendasi + export PDF + delete.
- **Responsif**: konten Beranda & semua layar Copper dibungkus `maxWidth: 760, alignSelf: center` agar rapi di laptop, tetap penuh di HP.
- **Verifikasi**: testing_agent — semua endpoint Copper + regresi KHT PASS; alur frontend Beranda/Copper dashboard/history/trend/result/scale + KHT masih jalan. Tidak ada bug fungsional. Lint bersih.

