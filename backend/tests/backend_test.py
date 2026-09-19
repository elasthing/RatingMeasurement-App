"""KHT + Copper AI VISION - Backend integration tests.

Tests the public API surface documented in the review request:
- KHT regression: /dashboard, /tests, /trend, /color-scale
- Copper: /copper/dashboard, /copper/tests(+search), /copper/tests/{id},
          /copper/trend, /copper/reference-scale, PUT (manual correction),
          DELETE (soft), and the AI job flow (upload -> analyze/start -> poll).
"""
import io
import os
import time
import base64
import pytest
import requests

try:
    from dotenv import load_dotenv as _ld
    _ld(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env"))
except Exception:
    pass

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


def _make_test_jpeg() -> bytes:
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (400, 400), (200, 130, 80))  # coppery orange
    d = ImageDraw.Draw(img)
    d.rectangle([50, 50, 350, 350], outline=(120, 60, 20), width=4)
    d.rectangle([100, 150, 300, 250], fill=(150, 90, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


TEST_IMAGE_BYTES = _make_test_jpeg()


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    return s


# ===========================================================================
# KHT regression - endpoints should still work after refactor
# ===========================================================================
class TestKHTRegression:
    def test_kht_dashboard(self, api_client):
        r = api_client.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("latest", "total", "passed", "failed", "avg_rating"):
            assert k in d
        assert d["total"] >= 4
        assert d["latest"] is not None
        assert d["latest"]["status"] in ("CLEAR", "TARNISH")
        assert d["passed"] + d["failed"] == d["total"]

    def test_kht_tests_list(self, api_client):
        r = api_client.get(f"{API}/tests", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 4
        assert all(rec["status"] in ("CLEAR", "TARNISH") for rec in rows)

    def test_kht_trend(self, api_client):
        r = api_client.get(f"{API}/trend", timeout=30)
        assert r.status_code == 200
        pts = r.json()
        assert isinstance(pts, list) and len(pts) >= 4
        for p in pts:
            for k in ("id", "rating", "status", "sample_id", "created_at"):
                assert k in p

    def test_kht_color_scale(self, api_client):
        r = api_client.get(f"{API}/color-scale", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("title", "note", "image", "levels"):
            assert k in d
        assert d["image"].startswith("data:image/")
        assert isinstance(d["levels"], list) and len(d["levels"]) == 11


# ===========================================================================
# Copper - dashboard, list, search, detail
# ===========================================================================
class TestCopperDashboard:
    def test_copper_dashboard(self, api_client):
        r = api_client.get(f"{API}/copper/dashboard", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("latest", "total", "passed", "failed"):
            assert k in d
        assert d["total"] >= 4, f"expected 4 seeded copper records, got {d['total']}"
        assert d["latest"] is not None
        assert d["latest"]["status"] in ("CLEAR", "TARNISH")
        assert d["passed"] + d["failed"] == d["total"]


class TestCopperListing:
    def test_copper_list(self, api_client):
        r = api_client.get(f"{API}/copper/tests", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 4
        sample_ids = {row["meta"]["sample_id"] for row in rows}
        assert "CU-2026-07-30-001" in sample_ids
        # Each record must have the enriched class fields
        for rec in rows:
            for k in ("classification", "class_label", "group", "color", "severity", "status"):
                assert k in rec
            assert rec["status"] in ("CLEAR", "TARNISH")

    def test_copper_search_by_sample(self, api_client):
        r = api_client.get(f"{API}/copper/tests", params={"q": "CU-2026-07-25"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        assert all("CU-2026-07-25" in row["meta"]["sample_id"] for row in rows)

    def test_copper_search_by_product(self, api_client):
        r = api_client.get(f"{API}/copper/tests", params={"q": "Gasoline"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1

    def test_copper_search_no_match(self, api_client):
        r = api_client.get(f"{API}/copper/tests", params={"q": "ZZZ_NOTFOUND"}, timeout=30)
        assert r.status_code == 200
        assert r.json() == []

    def test_copper_get_by_id(self, api_client):
        r = api_client.get(f"{API}/copper/tests", timeout=30)
        rid = r.json()[0]["id"]
        r2 = api_client.get(f"{API}/copper/tests/{rid}", timeout=30)
        assert r2.status_code == 200
        rec = r2.json()
        assert rec["id"] == rid
        assert "classification" in rec

    def test_copper_get_invalid_id(self, api_client):
        r = api_client.get(f"{API}/copper/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


class TestCopperTrend:
    def test_copper_trend(self, api_client):
        r = api_client.get(f"{API}/copper/trend", timeout=30)
        assert r.status_code == 200
        pts = r.json()
        assert isinstance(pts, list) and len(pts) >= 4
        for p in pts:
            for k in ("id", "classification", "severity", "status", "sample_id", "created_at"):
                assert k in p
        stamps = [p["created_at"] for p in pts]
        assert stamps == sorted(stamps)


class TestCopperReferenceScale:
    def test_reference_scale(self, api_client):
        r = api_client.get(f"{API}/copper/reference-scale", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("title", "note", "image", "classes"):
            assert k in d
        assert d["image"].startswith("data:image/"), d["image"][:30]
        # Must be a proper base64 data URI
        assert ";base64," in d["image"]
        classes = d["classes"]
        assert isinstance(classes, list) and len(classes) == 13
        codes = [c["code"] for c in classes]
        assert codes == ["0", "1a", "1b", "2a", "2b", "2c", "2d", "3a", "3b", "3c", "4a", "4b", "4c"]


# ===========================================================================
# Copper - manual correction (PUT) + soft delete
# ===========================================================================
class TestCopperManualCorrection:
    def _get_first_id(self, api_client):
        r = api_client.get(f"{API}/copper/tests", timeout=30)
        return r.json()[0]["id"]

    def test_put_classification_4b_recomputes_all_fields(self, api_client):
        rid = self._get_first_id(api_client)
        r = api_client.put(f"{API}/copper/tests/{rid}", json={"classification": "4b"}, timeout=30)
        assert r.status_code == 200, r.text
        rec = r.json()
        assert rec["classification"] == "4b"
        assert rec["group"] == "Corrosion"
        assert rec["color"] == "#2B2B2B"
        assert rec["severity"] == 11
        assert rec["status"] == "TARNISH"
        assert rec["edited"] is True

    def test_put_classification_1a_sets_clear(self, api_client):
        rid = self._get_first_id(api_client)
        r = api_client.put(f"{API}/copper/tests/{rid}", json={"classification": "1a"}, timeout=30)
        assert r.status_code == 200, r.text
        rec = r.json()
        assert rec["classification"] == "1a"
        assert rec["status"] == "CLEAR"
        assert rec["group"] == "Slight Tarnish"
        assert rec["severity"] == 1

    def test_put_persists_via_get(self, api_client):
        rid = self._get_first_id(api_client)
        api_client.put(f"{API}/copper/tests/{rid}", json={"classification": "2c"}, timeout=30)
        r = api_client.get(f"{API}/copper/tests/{rid}", timeout=30)
        rec = r.json()
        assert rec["classification"] == "2c"
        assert rec["status"] == "TARNISH"


class TestCopperSoftDelete:
    def test_soft_delete_flow(self, api_client):
        # Create a throwaway record via seed listing then delete it
        r = api_client.get(f"{API}/copper/tests", timeout=30)
        rows = r.json()
        # Pick last (oldest) so we don't wipe the visible latest for other tests
        target = rows[-1]
        rid = target["id"]
        rd = api_client.delete(f"{API}/copper/tests/{rid}", timeout=30)
        assert rd.status_code == 200
        # Must be gone from list + GET returns 404
        r2 = api_client.get(f"{API}/copper/tests/{rid}", timeout=30)
        assert r2.status_code == 404
        r3 = api_client.get(f"{API}/copper/tests", timeout=30)
        assert not any(x["id"] == rid for x in r3.json())

    def test_delete_invalid(self, api_client):
        r = api_client.delete(f"{API}/copper/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# ===========================================================================
# Copper AI flow - upload -> analyze/start -> poll (real Gemini call)
# ===========================================================================
class TestCopperAIJobFlow:
    def test_upload_and_start_job(self, api_client):
        files = {"file": ("TEST_copper.jpg", TEST_IMAGE_BYTES, "image/jpeg")}
        r = api_client.post(f"{API}/upload", files=files, timeout=120)
        assert r.status_code == 200, r.text
        image_path = r.json()["image_path"]
        pytest.copper_image_path = image_path

        payload = {
            "image_path": image_path,
            "sample_id": "TEST_COPPER_AI_001",
            "product": "TEST Diesel",
            "batch": "TEST_LOT_CU",
            "operator": "Auto Test",
            "temperature_c": 100,
            "duration_hours": 3,
            "remark": "copper pytest",
        }
        t0 = time.time()
        r2 = api_client.post(f"{API}/copper/analyze/start", json=payload, timeout=60)
        elapsed = time.time() - t0
        assert r2.status_code == 200, r2.text
        assert elapsed < 30, f"copper analyze/start blocked for {elapsed:.1f}s"
        job = r2.json()
        assert job.get("id") and job.get("status") == "running"
        pytest.copper_job_id = job["id"]

    def test_poll_copper_job(self, api_client):
        job_id = getattr(pytest, "copper_job_id", None)
        if not job_id:
            pytest.skip("start didn't succeed")
        deadline = time.time() + 180
        last = None
        while time.time() < deadline:
            time.sleep(3)
            r = api_client.get(f"{API}/copper/analyze/jobs/{job_id}", timeout=30)
            assert r.status_code == 200
            last = r.json()
            if last.get("status") != "running":
                break
        assert last and last.get("status") == "done", f"copper job did not finish: {last}"
        rid = last.get("record_id")
        assert rid
        pytest.copper_record_id = rid

    def test_copper_record_is_valid(self, api_client):
        rid = getattr(pytest, "copper_record_id", None)
        if not rid:
            pytest.skip("job didn't finish")
        r = api_client.get(f"{API}/copper/tests/{rid}", timeout=30)
        assert r.status_code == 200
        rec = r.json()
        assert rec["classification"] in [
            "0", "1a", "1b", "2a", "2b", "2c", "2d", "3a", "3b", "3c", "4a", "4b", "4c"
        ]
        assert rec["status"] in ("CLEAR", "TARNISH")
        assert rec["meta"]["sample_id"] == "TEST_COPPER_AI_001"
        assert (rec.get("ai_summary") or "").strip()
        assert rec.get("ai_model") == "gemini-3.1-pro-preview"

    def test_start_missing_image_404(self, api_client):
        payload = {
            "image_path": "kht-ai-vision/uploads/does-not-exist-xyz.jpg",
            "sample_id": "TEST_MISS", "product": "x", "batch": "x", "operator": "x",
            "temperature_c": 100, "duration_hours": 3, "remark": "",
        }
        r = api_client.post(f"{API}/copper/analyze/start", json=payload, timeout=30)
        assert r.status_code == 404

    def test_unknown_job_404(self, api_client):
        r = api_client.get(f"{API}/copper/analyze/jobs/no-such-id", timeout=30)
        assert r.status_code == 404

    def test_zz_cleanup_copper_record(self, api_client):
        rid = getattr(pytest, "copper_record_id", None)
        if not rid:
            pytest.skip("nothing to clean")
        r = api_client.delete(f"{API}/copper/tests/{rid}", timeout=30)
        assert r.status_code == 200
        r2 = api_client.get(f"{API}/copper/tests/{rid}", timeout=30)
        assert r2.status_code == 404
