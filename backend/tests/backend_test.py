"""KHT AI Vision - Backend integration tests.

Tests the public API surface documented in the review request:
- Dashboard, list/search, get by id, trend
- Upload -> Analyze -> Persist pipeline (Gemini)
- Delete (soft)
"""
import io
import os
import base64
import pytest
import requests

# Load EXPO_PUBLIC_BACKEND_URL from frontend/.env so tests hit the external URL
# through the K8s ingress (the same URL the mobile app uses).
try:
    from dotenv import load_dotenv as _ld
    _ld(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env"))
except Exception:
    pass

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://elastic-analyst.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# --- Real (non-blank) JPEG image with visual features -----------------------
# 8x8 JPEG with a gradient + a solid streak -> non-uniform, real edges.
def _make_test_jpeg() -> bytes:
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (256, 512), (30, 30, 30))
        d = ImageDraw.Draw(img)
        # simulated tube walls + a brownish deposit band in the middle
        d.rectangle([80, 20, 176, 500], outline=(180, 180, 180), width=3)
        d.rectangle([90, 200, 166, 320], fill=(120, 70, 30))  # deposit
        d.rectangle([90, 100, 166, 200], fill=(200, 180, 140))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception:
        # Fallback: minimal but non-uniform base64 JPEG
        b64 = (
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
            "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy"
            "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgACADASIA"
            "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA"
            "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3"
            "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm"
            "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA"
            "AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx"
            "BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK"
            "U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3"
            "uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+ii"
            "igAooooA//9k="
        )
        return base64.b64decode(b64)


TEST_IMAGE_BYTES = _make_test_jpeg()


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def seeded_tests(api_client):
    r = api_client.get(f"{API}/tests", timeout=30)
    assert r.status_code == 200, r.text
    tests = r.json()
    assert isinstance(tests, list)
    return tests


# ---------------------------------------------------------------------------
# Health / dashboard
# ---------------------------------------------------------------------------
class TestDashboard:
    def test_dashboard_returns_latest_seed(self, api_client):
        r = api_client.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("latest", "total", "passed", "failed", "avg_rating"):
            assert k in data
        assert data["total"] >= 4, f"expected at least 4 seeded, got {data['total']}"
        assert data["latest"] is not None
        latest = data["latest"]
        # Latest must at least be a well-formed record
        assert "meta" in latest and latest["meta"].get("sample_id")
        assert 0 <= latest["rating"] <= 10
        assert latest["status"] in ("PASS", "FAIL")
        # totals sanity
        assert data["passed"] + data["failed"] == data["total"]

    def test_seeded_sample_still_present(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "KHT-2026-07-30-001"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        rec = rows[0]
        assert rec["rating"] == 8.7
        assert rec["status"] == "PASS"


# ---------------------------------------------------------------------------
# Tests listing / search / detail
# ---------------------------------------------------------------------------
class TestListingAndSearch:
    def test_list_tests_seeded_count(self, seeded_tests):
        assert len(seeded_tests) >= 4
        sample_ids = {t["meta"]["sample_id"] for t in seeded_tests}
        assert "KHT-2026-07-30-001" in sample_ids

    def test_search_by_sample_id(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "KHT-2026-07-25"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        assert all("KHT-2026-07-25" in row["meta"]["sample_id"] for row in rows)

    def test_search_by_operator(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "Dwi"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        assert all("Dwi" in row["meta"]["operator"] for row in rows)

    def test_search_no_match(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "ZZZ_NOTFOUND_XYZ"}, timeout=30)
        assert r.status_code == 200
        assert r.json() == []

    def test_get_test_by_id(self, api_client, seeded_tests):
        tid = seeded_tests[0]["id"]
        r = api_client.get(f"{API}/tests/{tid}", timeout=30)
        assert r.status_code == 200
        rec = r.json()
        assert rec["id"] == tid
        assert "parameters" in rec
        assert "meta" in rec

    def test_get_test_invalid_id(self, api_client):
        r = api_client.get(f"{API}/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Trend
# ---------------------------------------------------------------------------
class TestTrend:
    def test_trend_endpoint(self, api_client):
        r = api_client.get(f"{API}/trend", timeout=30)
        assert r.status_code == 200
        points = r.json()
        assert isinstance(points, list)
        assert len(points) >= 4
        for p in points:
            for k in ("id", "rating", "status", "sample_id", "created_at"):
                assert k in p
        # ordered ascending by created_at
        stamps = [p["created_at"] for p in points]
        assert stamps == sorted(stamps)


# ---------------------------------------------------------------------------
# Native multipart shape verification (mimics expo FileSystem.uploadAsync)
# ---------------------------------------------------------------------------
class TestNativeStyleMultipartUpload:
    """expo-file-system FileSystem.uploadAsync sends a bare multipart/form-data
    body with a single part whose name is exactly the configured `fieldName`
    ('file' per api.ts). This class exercises that exact shape without letting
    `requests` add any extra parts, then verifies /api/files/{path} serves the
    same bytes back with an image content-type.
    """

    def test_upload_accepts_expo_native_multipart(self, api_client):
        # Bare, hand-crafted multipart body exactly like FileSystem.uploadAsync
        boundary = "----ExpoFileSystemBoundary" + base64.b32encode(os.urandom(6)).decode().rstrip("=")
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="photo.jpg"\r\n'
            f"Content-Type: image/jpeg\r\n\r\n"
        ).encode("utf-8") + TEST_IMAGE_BYTES + f"\r\n--{boundary}--\r\n".encode("utf-8")

        r = requests.post(
            f"{API}/upload",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "image_path" in data and data["image_path"], data
        pytest.native_image_path = data["image_path"]

    def test_files_endpoint_returns_image_bytes(self, api_client):
        path = getattr(pytest, "native_image_path", None)
        if not path:
            pytest.skip("upload didn't run")
        r = api_client.get(f"{API}/files/{path}", timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("Content-Type", "")
        assert ct.startswith("image/"), f"expected image/*, got {ct}"
        assert len(r.content) > 200, "file body too small"
        # JPEG SOI header
        assert r.content[:3] == b"\xff\xd8\xff", "not a JPEG"


# ---------------------------------------------------------------------------
# Chunked upload fallback (NEW) — /api/upload/chunk + /api/upload/finish
# When multipart POST /api/upload is blocked at the network layer (corp
# proxies / DLP / body-size limits), the frontend falls back to base64 JSON
# chunks. Verify chunks aggregate correctly, files serve identical bytes,
# and error cases (unknown upload_id, missing chunks, bad index) return the
# right status codes.
# ---------------------------------------------------------------------------
class TestChunkedUpload:
    """Base64 JSON chunk upload fallback used when multipart is blocked."""

    def test_chunked_upload_roundtrip(self, api_client):
        # Large noisy JPEG so base64 exceeds the 300KB chunk boundary and we
        # exercise multi-chunk assembly. Plain gradients compress too well.
        from PIL import Image
        import random as _r
        _r.seed(1)
        w, h = 900, 700
        img = Image.new("RGB", (w, h))
        img.putdata([(_r.randint(60, 220), _r.randint(30, 180), _r.randint(20, 160)) for _ in range(w * h)])
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92)
        big = buf.getvalue()
        assert len(big) > 250_000, f"expected substantial image, got {len(big)}"
        b64 = base64.b64encode(big).decode("ascii")
        CHUNK = 300 * 1024
        total = max(1, -(-len(b64) // CHUNK))
        assert total >= 2, f"expected multiple chunks, got {total}"
        upload_id = "TEST_chunked_" + base64.b32encode(os.urandom(6)).decode().rstrip("=")
        for i in range(total):
            payload = {
                "upload_id": upload_id,
                "index": i,
                "total": total,
                "data": b64[i * CHUNK:(i + 1) * CHUNK],
            }
            r = api_client.post(f"{API}/upload/chunk", json=payload, timeout=60)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body.get("received") == i + 1
            assert body.get("total") == total
        r = api_client.post(f"{API}/upload/finish", json={"upload_id": upload_id, "ext": "jpg"}, timeout=120)
        assert r.status_code == 200, r.text
        image_path = r.json().get("image_path")
        assert image_path and image_path.endswith(".jpg"), image_path
        # Verify bytes served back are byte-identical
        rf = api_client.get(f"{API}/files/{image_path}", timeout=60)
        assert rf.status_code == 200
        assert rf.headers.get("Content-Type", "").startswith("image/")
        assert rf.content == big, f"served bytes differ (served {len(rf.content)} vs original {len(big)})"
        pytest.chunked_image_path = image_path

    def test_chunked_finish_unknown_upload_id_returns_404(self, api_client):
        r = api_client.post(
            f"{API}/upload/finish",
            json={"upload_id": "TEST_bogus_unknown_id_xyz", "ext": "jpg"},
            timeout=30,
        )
        assert r.status_code == 404, r.text

    def test_chunked_finish_missing_chunks_returns_400(self, api_client):
        upload_id = "TEST_partial_" + base64.b32encode(os.urandom(6)).decode().rstrip("=")
        # Send only index 0 of total 3
        payload = {"upload_id": upload_id, "index": 0, "total": 3, "data": base64.b64encode(b"abc").decode("ascii")}
        r = api_client.post(f"{API}/upload/chunk", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        r2 = api_client.post(f"{API}/upload/finish", json={"upload_id": upload_id, "ext": "jpg"}, timeout=30)
        assert r2.status_code == 400, r2.text

    def test_chunked_bad_index_returns_400(self, api_client):
        upload_id = "TEST_badidx_" + base64.b32encode(os.urandom(6)).decode().rstrip("=")
        payload = {"upload_id": upload_id, "index": 5, "total": 3, "data": base64.b64encode(b"abc").decode("ascii")}
        r = api_client.post(f"{API}/upload/chunk", json=payload, timeout=30)
        assert r.status_code == 400, r.text

    def test_analyze_chunked_image_end_to_end(self, api_client):
        image_path = getattr(pytest, "chunked_image_path", None)
        if not image_path:
            pytest.skip("chunked upload roundtrip didn't succeed")
        payload = {
            "image_path": image_path,
            "sample_id": "TEST_CHUNKED_ANALYZE",
            "oil_type": "Engine Oil SAE 15W-40",
            "batch": "TEST_CHUNK_LOT",
            "operator": "Automated Chunk Test",
            "temperature_c": 320, "duration_hours": 16, "air_flow": 10, "oil_flow": 0.31,
            "remark": "chunked-upload pytest",
        }
        import time as _t
        r = api_client.post(f"{API}/analyze/start", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        job = r.json()
        assert job.get("id") and job.get("status") == "running", job
        deadline = _t.time() + 300
        last = None
        while _t.time() < deadline:
            _t.sleep(3)
            rp = api_client.get(f"{API}/analyze/jobs/{job['id']}", timeout=30)
            assert rp.status_code == 200
            last = rp.json()
            if last.get("status") != "running":
                break
        assert last and last.get("status") == "done", f"chunked analyze did not finish: {last}"
        rid = last.get("record_id")
        assert rid, last
        rr = api_client.get(f"{API}/tests/{rid}", timeout=30)
        assert rr.status_code == 200
        rec = rr.json()
        assert 0 <= rec["rating"] <= 10
        assert rec["meta"]["sample_id"] == "TEST_CHUNKED_ANALYZE"
        pytest.chunked_analyze_id = rid

    def test_zz_cleanup_chunked_analyze_record(self, api_client):
        rid = getattr(pytest, "chunked_analyze_id", None)
        if not rid:
            pytest.skip("no chunked analyze record")
        r = api_client.delete(f"{API}/tests/{rid}", timeout=30)
        assert r.status_code == 200
        r2 = api_client.get(f"{API}/tests/{rid}", timeout=30)
        assert r2.status_code == 404




# ---------------------------------------------------------------------------
# Upload -> Analyze pipeline (real AI)
# ---------------------------------------------------------------------------
class TestAnalyzePipeline:
    def test_upload_image_returns_path(self, api_client):
        files = {"file": ("TEST_tube.jpg", TEST_IMAGE_BYTES, "image/jpeg")}
        r = api_client.post(f"{API}/upload", files=files, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "image_path" in data and data["image_path"]
        pytest.image_path = data["image_path"]

    def test_analyze_returns_test_record(self, api_client):
        image_path = getattr(pytest, "image_path", None)
        if not image_path:
            pytest.skip("upload step didn't succeed")
        payload = {
            "image_path": image_path,
            "sample_id": "TEST_AI_INTEGRATION_001",
            "oil_type": "Test Oil",
            "batch": "TEST_LOT",
            "operator": "Automated Test",
            "temperature_c": 320,
            "duration_hours": 16,
            "air_flow": 10,
            "oil_flow": 0.31,
            "remark": "automated pytest",
        }
        r = api_client.post(f"{API}/analyze", json=payload, timeout=180)
        assert r.status_code == 200, r.text
        rec = r.json()
        assert 0 <= rec["rating"] <= 10
        assert rec["status"] in ("PASS", "FAIL")
        assert rec["performance"]
        assert "parameters" in rec
        params = rec["parameters"]
        for k in (
            "deposit_area_pct",
            "deposit_length_mm",
            "deposit_coverage_pct",
            "avg_intensity_l",
            "avg_color_a",
            "avg_color_b",
            "max_intensity",
            "thickness_index_mm",
        ):
            assert k in params
        assert rec["meta"]["sample_id"] == "TEST_AI_INTEGRATION_001"
        # New: AI justification (Bahasa Indonesia) must be non-empty sentence
        assert "ai_summary" in rec, rec
        summary = (rec.get("ai_summary") or "").strip()
        assert len(summary) >= 10, f"ai_summary too short/empty: {summary!r}"
        pytest.analyzed_id = rec["id"]
        pytest.analyzed_summary = summary

    def test_analyzed_record_persisted(self, api_client):
        tid = getattr(pytest, "analyzed_id", None)
        if not tid:
            pytest.skip("analyze step didn't succeed")
        r = api_client.get(f"{API}/tests/{tid}", timeout=30)
        assert r.status_code == 200
        # also check it appears in list
        r2 = api_client.get(f"{API}/tests", params={"q": "TEST_AI_INTEGRATION_001"}, timeout=30)
        assert r2.status_code == 200
        assert any(x["id"] == tid for x in r2.json())

    def test_zz_soft_delete_analyzed_record(self, api_client):
        """Kept inside this class so it runs on the same xdist worker as the
        upload/analyze steps that populate pytest.analyzed_id."""
        tid = getattr(pytest, "analyzed_id", None)
        if not tid:
            pytest.skip("no analyzed_id from analyze test")
        r = api_client.delete(f"{API}/tests/{tid}", timeout=30)
        assert r.status_code == 200
        r2 = api_client.get(f"{API}/tests/{tid}", timeout=30)
        assert r2.status_code == 404
        r3 = api_client.get(f"{API}/tests", params={"q": "TEST_AI_INTEGRATION_001"}, timeout=30)
        assert r3.status_code == 200
        assert not any(x["id"] == tid for x in r3.json())


# ---------------------------------------------------------------------------
# Delete (soft) - invalid id only; the main analyze->delete flow is now
# inside TestAnalyzePipeline so it shares a pytest-xdist worker.
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Delete (soft) - invalid id only; the main analyze->delete flow is now
# inside TestAnalyzePipeline so it shares a pytest-xdist worker.
# ---------------------------------------------------------------------------
class TestDelete:
    def test_delete_invalid_id_returns_404(self, api_client):
        r = api_client.delete(f"{API}/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Async analyze flow (NEW) — POST /api/analyze/start + GET /api/analyze/jobs/{id}
# The ingress proxy times out at ~60s so Gemini analysis must run as a
# background job. Each individual HTTP request must complete quickly (< 60s),
# and the polling flow must yield a completed record within ~5 min.
# ---------------------------------------------------------------------------
def _make_large_brownish_jpeg(width: int = 2400, height: int = 1400) -> bytes:
    """A large 2400x1400 brownish-gradient JPEG (few MB) that emulates a real
    photo taken on a phone — used to force the backend downscale path."""
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (width, height), (60, 40, 20))
    px = img.load()
    for y in range(height):
        t = y / height
        r = int(200 * (1 - t) + 60 * t)
        g = int(140 * (1 - t) + 40 * t)
        b = int(80 * (1 - t) + 20 * t)
        for x in range(width):
            px[x, y] = (r, g, b)
    d = ImageDraw.Draw(img)
    # simulate a vertical tube with a brown deposit band
    tube_left, tube_right = width // 2 - 200, width // 2 + 200
    d.rectangle([tube_left, 80, tube_right, height - 80], outline=(220, 220, 220), width=8)
    d.rectangle([tube_left + 20, height // 3, tube_right - 20, 2 * height // 3], fill=(90, 55, 25))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


class TestAsyncAnalyzeJob:
    """New async job flow: /analyze/start + /analyze/jobs/{id} polling."""

    def test_upload_large_photo(self, api_client):
        big = _make_large_brownish_jpeg(2400, 1400)
        assert len(big) > 50_000, f"expected substantial image, got {len(big)}"
        files = {"file": ("TEST_big_tube.jpg", big, "image/jpeg")}
        r = api_client.post(f"{API}/upload", files=files, timeout=180)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("image_path"), data
        pytest.big_image_path = data["image_path"]

    def test_analyze_start_returns_running_job_quickly(self, api_client):
        image_path = getattr(pytest, "big_image_path", None)
        if not image_path:
            pytest.skip("upload step didn't succeed")
        payload = {
            "image_path": image_path,
            "sample_id": "TEST-JOB-1",
            "oil_type": "Engine Oil SAE 15W-40",
            "batch": "TEST_JOB_LOT",
            "operator": "Automated Job Test",
            "temperature_c": 320,
            "duration_hours": 16,
            "air_flow": 10,
            "oil_flow": 0.31,
            "remark": "async job pytest",
        }
        import time as _t
        t0 = _t.time()
        r = api_client.post(f"{API}/analyze/start", json=payload, timeout=60)
        elapsed = _t.time() - t0
        assert r.status_code == 200, r.text
        # The critical fix: /analyze/start must return well under the 60s
        # ingress limit — usually within a couple of seconds.
        assert elapsed < 30, f"/analyze/start blocked for {elapsed:.1f}s (should be near-instant)"
        job = r.json()
        assert job.get("id"), job
        assert job.get("status") == "running", job
        assert job.get("record_id") in (None, ""), job
        pytest.job_id = job["id"]

    def test_poll_job_until_done(self, api_client):
        job_id = getattr(pytest, "job_id", None)
        if not job_id:
            pytest.skip("analyze/start didn't succeed")
        import time as _t
        deadline = _t.time() + 300  # 5 min
        last = None
        status = None
        while _t.time() < deadline:
            _t.sleep(3)
            t0 = _t.time()
            r = api_client.get(f"{API}/analyze/jobs/{job_id}", timeout=30)
            single = _t.time() - t0
            assert r.status_code == 200, r.text
            # every individual poll must be a quick request (well below 60s)
            assert single < 30, f"single poll took {single:.1f}s"
            last = r.json()
            status = last.get("status")
            if status != "running":
                break
        assert status == "done", f"job did not complete cleanly: {last}"
        assert last.get("record_id"), last
        pytest.job_record_id = last["record_id"]

    def test_job_record_is_valid_test_record(self, api_client):
        rid = getattr(pytest, "job_record_id", None)
        if not rid:
            pytest.skip("job didn't complete")
        r = api_client.get(f"{API}/tests/{rid}", timeout=30)
        assert r.status_code == 200, r.text
        rec = r.json()
        assert 0 <= rec["rating"] <= 10
        assert rec["status"] in ("PASS", "FAIL")
        assert rec.get("ai_model") == "gemini-3.1-pro-preview"
        summary = (rec.get("ai_summary") or "").strip()
        assert len(summary) >= 10, f"ai_summary too short: {summary!r}"
        # meta round-trip
        assert rec["meta"]["sample_id"] == "TEST-JOB-1"
        assert float(rec["meta"]["temperature_c"]) == 320
        assert float(rec["meta"]["duration_hours"]) == 16
        assert float(rec["meta"]["air_flow"]) == 10
        assert abs(float(rec["meta"]["oil_flow"]) - 0.31) < 1e-6
        # numeric parameters
        p = rec["parameters"]
        for k in (
            "deposit_area_pct", "deposit_length_mm", "deposit_coverage_pct",
            "avg_intensity_l", "avg_color_a", "avg_color_b", "max_intensity",
            "thickness_index_mm", "deposit_start_mm", "deposit_end_mm",
        ):
            assert isinstance(p[k], (int, float)), f"{k}={p[k]!r} not numeric"

    def test_analyze_start_missing_image_returns_404(self, api_client):
        payload = {
            "image_path": "kht-ai-vision/uploads/does-not-exist-xyz.jpg",
            "sample_id": "TEST_MISSING",
            "oil_type": "x", "batch": "x", "operator": "x",
            "temperature_c": 320, "duration_hours": 16, "air_flow": 10, "oil_flow": 0.31,
            "remark": "",
        }
        r = api_client.post(f"{API}/analyze/start", json=payload, timeout=30)
        assert r.status_code == 404, r.text

    def test_analyze_jobs_unknown_id_returns_404(self, api_client):
        r = api_client.get(f"{API}/analyze/jobs/nonexistent-xyz", timeout=30)
        assert r.status_code == 404

    def test_zz_cleanup_job_record(self, api_client):
        rid = getattr(pytest, "job_record_id", None)
        if not rid:
            pytest.skip("no record to clean up")
        r = api_client.delete(f"{API}/tests/{rid}", timeout=30)
        assert r.status_code == 200
        r2 = api_client.get(f"{API}/tests/{rid}", timeout=30)
        assert r2.status_code == 404


# ---------------------------------------------------------------------------
# Color scale (regression)
# ---------------------------------------------------------------------------
class TestColorScale:
    def test_color_scale_endpoint(self, api_client):
        r = api_client.get(f"{API}/color-scale", timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("title", "note", "image", "levels"):
            assert k in data
        assert isinstance(data["levels"], list) and len(data["levels"]) == 11

