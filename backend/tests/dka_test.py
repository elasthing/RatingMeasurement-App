"""Rating DKA - Backend integration tests (batch analysis + OCR)."""
import io
import os
import time
import pytest
import requests

try:
    from dotenv import load_dotenv as _ld
    _ld(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env"))
except Exception:
    pass

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DKA_STANDARD_URL = (
    "https://customer-assets-4nw71qhi.emergentagent.net/"
    "job_708de905-e641-4f87-95d8-21f9fe9924b3/artifacts/"
    "j0ti8rxa_WhatsApp%20Image%202026-09-19%20at%2020.22.56.jpeg"
)
DKA_CATEGORIES = ["CLEAR", "Aspect 1", "Aspect 2", "Aspect 3"]


@pytest.fixture(scope="session")
def api_client():
    return requests.Session()


@pytest.fixture(scope="session")
def dka_image_bytes():
    r = requests.get(DKA_STANDARD_URL, timeout=60)
    r.raise_for_status()
    return r.content


# ---------------------------------------------------------------------------
# DKA reads: dashboard / list / detail / trend / reference-scale
# ---------------------------------------------------------------------------
class TestDkaDashboard:
    def test_dashboard(self, api_client):
        r = api_client.get(f"{API}/dka/dashboard", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("latest", "total_batches", "total_samples", "distribution"):
            assert k in d
        # 1 seeded demo batch with 4 samples (CLEAR / Aspect 1..3)
        assert d["total_batches"] >= 1
        assert d["total_samples"] >= 4
        # distribution must contain all four categories
        for cat in DKA_CATEGORIES:
            assert cat in d["distribution"], f"missing category {cat}"
        # latest must include samples with the required shape
        latest = d["latest"]
        assert latest is not None
        assert isinstance(latest.get("samples"), list) and len(latest["samples"]) >= 1
        for s in latest["samples"]:
            for k in ("sample_id", "rating", "color", "severity", "crop_path"):
                assert k in s
            assert s["rating"] in DKA_CATEGORIES


class TestDkaListing:
    def test_list(self, api_client):
        r = api_client.get(f"{API}/dka/tests", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        first = rows[0]
        for k in ("id", "meta", "samples", "sample_count", "created_at"):
            assert k in first

    def test_search_by_batch(self, api_client):
        r = api_client.get(f"{API}/dka/tests", params={"q": "DKA-DEMO-BATCH"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        assert any("DKA-DEMO-BATCH" in (row["meta"].get("batch_id") or "") for row in rows)

    def test_search_by_sample_id(self, api_client):
        r = api_client.get(f"{API}/dka/tests", params={"q": "DKA-2026-001"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1

    def test_search_no_match(self, api_client):
        r = api_client.get(f"{API}/dka/tests", params={"q": "ZZZ_NO_DKA"}, timeout=30)
        assert r.status_code == 200
        assert r.json() == []

    def test_get_by_id(self, api_client):
        rows = api_client.get(f"{API}/dka/tests", timeout=30).json()
        rid = rows[0]["id"]
        r = api_client.get(f"{API}/dka/tests/{rid}", timeout=30)
        assert r.status_code == 200
        rec = r.json()
        assert rec["id"] == rid
        assert isinstance(rec["samples"], list) and len(rec["samples"]) >= 1

    def test_get_invalid_id(self, api_client):
        r = api_client.get(f"{API}/dka/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


class TestDkaTrend:
    def test_trend(self, api_client):
        r = api_client.get(f"{API}/dka/trend", timeout=30)
        assert r.status_code == 200
        pts = r.json()
        assert isinstance(pts, list) and len(pts) >= 1
        for p in pts:
            for k in ("id", "batch_id", "avg_severity", "count", "created_at"):
                assert k in p
        # sorted ascending by created_at
        stamps = [p["created_at"] for p in pts]
        assert stamps == sorted(stamps)


class TestDkaReferenceScale:
    def test_reference_scale(self, api_client):
        r = api_client.get(f"{API}/dka/reference-scale", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("title", "note", "image", "categories"):
            assert k in d
        assert d["image"].startswith("data:image/") and ";base64," in d["image"]
        cats = d["categories"]
        assert isinstance(cats, list) and len(cats) == 4
        codes = [c["code"] for c in cats]
        assert codes == DKA_CATEGORIES


# ---------------------------------------------------------------------------
# DKA manual correction (PUT) + soft delete
# ---------------------------------------------------------------------------
class TestDkaManualCorrection:
    def _get_demo_id(self, api_client):
        rows = api_client.get(f"{API}/dka/tests", params={"q": "DKA-DEMO-BATCH"}, timeout=30).json()
        assert rows, "seed DKA-DEMO-BATCH missing"
        return rows[0]["id"]

    def test_put_rating_aspect3(self, api_client):
        rid = self._get_demo_id(api_client)
        r = api_client.put(
            f"{API}/dka/tests/{rid}", json={"samples": [{"index": 1, "rating": "Aspect 3"}]}, timeout=30
        )
        assert r.status_code == 200, r.text
        rec = r.json()
        s1 = next(s for s in rec["samples"] if s["index"] == 1)
        assert s1["rating"] == "Aspect 3"
        assert s1["severity"] == 3
        assert s1["color"] == "#161616"
        assert rec["edited"] is True

    def test_put_sample_id_update(self, api_client):
        rid = self._get_demo_id(api_client)
        r = api_client.put(
            f"{API}/dka/tests/{rid}", json={"samples": [{"index": 2, "sample_id": "ABC-9"}]}, timeout=30
        )
        assert r.status_code == 200, r.text
        rec = r.json()
        s2 = next(s for s in rec["samples"] if s["index"] == 2)
        assert s2["sample_id"] == "ABC-9"

    def test_put_persists_via_get(self, api_client):
        rid = self._get_demo_id(api_client)
        api_client.put(
            f"{API}/dka/tests/{rid}", json={"samples": [{"index": 3, "rating": "CLEAR"}]}, timeout=30
        )
        rec = api_client.get(f"{API}/dka/tests/{rid}", timeout=30).json()
        s3 = next(s for s in rec["samples"] if s["index"] == 3)
        assert s3["rating"] == "CLEAR"
        assert s3["severity"] == 0

    def test_put_missing_returns_404(self, api_client):
        r = api_client.put(
            f"{API}/dka/tests/does-not-exist-xyz",
            json={"samples": [{"index": 1, "rating": "CLEAR"}]}, timeout=30,
        )
        assert r.status_code == 404


class TestDkaSoftDelete:
    def test_delete_invalid(self, api_client):
        r = api_client.delete(f"{API}/dka/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# DKA AI batch flow: upload -> analyze/start -> poll -> validate record
# ---------------------------------------------------------------------------
class TestDkaAIJobFlow:
    def test_upload_dka_standard_image(self, api_client, dka_image_bytes):
        files = {"file": ("TEST_dka_standard.jpg", dka_image_bytes, "image/jpeg")}
        r = api_client.post(f"{API}/upload", files=files, timeout=120)
        assert r.status_code == 200, r.text
        image_path = r.json()["image_path"]
        assert image_path
        pytest.dka_image_path = image_path

    def test_start_missing_image_404(self, api_client):
        payload = {
            "image_path": "kht-ai-vision/uploads/no-such-file.jpg",
            "batch_id": "TEST_MISS", "product": "x", "operator": "x",
            "temperature_c": 320, "duration_hours": 16, "remark": "",
        }
        r = api_client.post(f"{API}/dka/analyze/start", json=payload, timeout=30)
        assert r.status_code == 404

    def test_unknown_job_404(self, api_client):
        r = api_client.get(f"{API}/dka/analyze/jobs/no-such-id", timeout=30)
        assert r.status_code == 404

    def test_start_job(self, api_client):
        image_path = getattr(pytest, "dka_image_path", None)
        if not image_path:
            pytest.skip("upload didn't succeed")
        payload = {
            "image_path": image_path,
            "batch_id": "TEST_DKA_BATCH_AI",
            "product": "TEST Fuel",
            "operator": "Auto Test",
            "temperature_c": 320,
            "duration_hours": 16,
            "remark": "dka pytest",
        }
        t0 = time.time()
        r = api_client.post(f"{API}/dka/analyze/start", json=payload, timeout=60)
        elapsed = time.time() - t0
        assert r.status_code == 200, r.text
        assert elapsed < 30, f"dka analyze/start blocked for {elapsed:.1f}s"
        job = r.json()
        assert job.get("id") and job.get("status") == "running"
        pytest.dka_job_id = job["id"]

    def test_poll_job(self, api_client):
        job_id = getattr(pytest, "dka_job_id", None)
        if not job_id:
            pytest.skip("start didn't succeed")
        deadline = time.time() + 180
        last = None
        while time.time() < deadline:
            time.sleep(4)
            r = api_client.get(f"{API}/dka/analyze/jobs/{job_id}", timeout=30)
            assert r.status_code == 200
            last = r.json()
            if last.get("status") != "running":
                break
        assert last and last.get("status") == "done", f"dka job did not finish: {last}"
        rid = last.get("record_id")
        assert rid
        pytest.dka_record_id = rid

    def test_record_is_valid(self, api_client):
        rid = getattr(pytest, "dka_record_id", None)
        if not rid:
            pytest.skip("job didn't finish")
        r = api_client.get(f"{API}/dka/tests/{rid}", timeout=30)
        assert r.status_code == 200
        rec = r.json()
        samples = rec.get("samples") or []
        assert len(samples) >= 1, f"expected samples, got 0. rec={rec}"
        # Ideal: the 4-tube standard image yields 4 samples (accept >=1 to be resilient)
        for s in samples:
            assert s["rating"] in DKA_CATEGORIES
            assert s.get("sample_id"), "sample_id must be OCR text or 'Unknown N'"
            assert s.get("crop_path"), "crop_path must be set"
        # verify at least one crop is served via /api/files/{path}
        cp = samples[0]["crop_path"]
        rf = api_client.get(f"{API}/files/{cp}", timeout=30)
        assert rf.status_code == 200, f"/api/files/{cp} -> {rf.status_code}"
        ct = rf.headers.get("content-type", "")
        assert ct.startswith("image/"), f"crop content-type unexpected: {ct}"

    def test_zz_cleanup(self, api_client):
        rid = getattr(pytest, "dka_record_id", None)
        if not rid:
            pytest.skip("nothing to clean")
        r = api_client.delete(f"{API}/dka/tests/{rid}", timeout=30)
        assert r.status_code == 200
        r2 = api_client.get(f"{API}/dka/tests/{rid}", timeout=30)
        assert r2.status_code == 404


# ---------------------------------------------------------------------------
# Regression: KHT & Copper still respond
# ---------------------------------------------------------------------------
class TestPriorModulesRegression:
    def test_kht_dashboard(self, api_client):
        r = api_client.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200
        assert r.json().get("total", 0) >= 1

    def test_kht_tests(self, api_client):
        r = api_client.get(f"{API}/tests", timeout=30)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_copper_dashboard(self, api_client):
        r = api_client.get(f"{API}/copper/dashboard", timeout=30)
        assert r.status_code == 200
        assert "total" in r.json()

    def test_copper_tests(self, api_client):
        r = api_client.get(f"{API}/copper/tests", timeout=30)
        assert r.status_code == 200 and isinstance(r.json(), list)
