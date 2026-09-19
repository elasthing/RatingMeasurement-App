#!/usr/bin/env python3
"""
KHT AI VISION Backend API Test Suite - Nikko Color Scale Feature Verification
Tests the new Nikko Color Scale endpoint and verifies AI analyze still works with two-image comparison
"""
import os
import sys
import time
import requests
from pathlib import Path

# Backend URL from frontend/.env
BACKEND_URL = "https://elastic-analyst.preview.emergentagent.com/api"
TEST_IMAGE_PATH = "/app/backend/reference/color_scale.jpg"

# Test metadata
TEST_SAMPLE_ID = "NIKKO-QA-001"
TEST_OIL_TYPE = "Engine Oil"
TEST_BATCH = "LOT-QA"
TEST_OPERATOR = "QA Bot"

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def log_test(name):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST: {name}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")

def log_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def log_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def log_info(msg):
    print(f"{YELLOW}ℹ {msg}{RESET}")

def log_detail(key, value):
    print(f"  {key}: {value}")

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

# ============================================================================
# TEST 1: NEW endpoint GET /api/color-scale
# ============================================================================
def test_color_scale_endpoint():
    """Test GET /api/color-scale returns proper structure with 11 levels"""
    log_test("TEST 1: GET /api/color-scale - Nikko Color Scale Endpoint")
    try:
        resp = requests.get(f"{BACKEND_URL}/color-scale", timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/color-scale - status {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Check required keys
        required_keys = ["title", "note", "image", "levels"]
        missing = [k for k in required_keys if k not in data]
        if missing:
            log_error(f"Missing required keys: {missing}")
            test_results["failed"].append(f"GET /api/color-scale - missing keys: {missing}")
            return False
        
        # Validate title
        title = data.get("title")
        if not isinstance(title, str) or not title:
            log_error(f"Invalid title: {title}")
            test_results["failed"].append("GET /api/color-scale - invalid title")
            return False
        log_detail("Title", title)
        
        # Validate note
        note = data.get("note")
        if not isinstance(note, str):
            log_error(f"Invalid note: {note}")
            test_results["failed"].append("GET /api/color-scale - invalid note")
            return False
        log_detail("Note", note[:80] + "..." if len(note) > 80 else note)
        
        # Validate image (base64 data URI)
        image = data.get("image")
        if not isinstance(image, str):
            log_error(f"Image is not a string")
            test_results["failed"].append("GET /api/color-scale - image not string")
            return False
        
        if not image.startswith("data:image/jpeg;base64,"):
            log_error(f"Image does not start with 'data:image/jpeg;base64,'")
            test_results["failed"].append("GET /api/color-scale - invalid image data URI")
            return False
        
        # Check base64 payload is non-trivial (> 10000 chars)
        if len(image) <= 10000:
            log_error(f"Image base64 payload too short: {len(image)} chars (expected > 10000)")
            test_results["failed"].append("GET /api/color-scale - image payload too short")
            return False
        log_detail("Image", f"data:image/jpeg;base64,... ({len(image)} chars)")
        
        # Validate levels array
        levels = data.get("levels")
        if not isinstance(levels, list):
            log_error(f"Levels is not a list")
            test_results["failed"].append("GET /api/color-scale - levels not list")
            return False
        
        # Must have exactly 11 levels (0-10)
        if len(levels) != 11:
            log_error(f"Expected 11 levels, got {len(levels)}")
            test_results["failed"].append(f"GET /api/color-scale - wrong level count: {len(levels)}")
            return False
        log_detail("Levels Count", len(levels))
        
        # Validate each level entry
        required_level_keys = ["level", "color", "name", "condition", "deposit_pct", "grade", "status"]
        for i, lvl in enumerate(levels):
            # Check all required keys present
            missing_keys = [k for k in required_level_keys if k not in lvl]
            if missing_keys:
                log_error(f"Level {i} missing keys: {missing_keys}")
                test_results["failed"].append(f"GET /api/color-scale - level {i} missing keys")
                return False
            
            # Validate level number
            level_num = lvl.get("level")
            if not isinstance(level_num, int) or level_num != i:
                log_error(f"Level {i} has invalid level number: {level_num}")
                test_results["failed"].append(f"GET /api/color-scale - level {i} invalid number")
                return False
            
            # Validate color is hex string
            color = lvl.get("color")
            if not isinstance(color, str) or not color.startswith("#"):
                log_error(f"Level {i} has invalid color: {color}")
                test_results["failed"].append(f"GET /api/color-scale - level {i} invalid color")
                return False
            
            # Validate name is non-empty string
            name = lvl.get("name")
            if not isinstance(name, str) or not name:
                log_error(f"Level {i} has invalid name: {name}")
                test_results["failed"].append(f"GET /api/color-scale - level {i} invalid name")
                return False
            
            # Validate condition is non-empty string
            condition = lvl.get("condition")
            if not isinstance(condition, str) or not condition:
                log_error(f"Level {i} has invalid condition: {condition}")
                test_results["failed"].append(f"GET /api/color-scale - level {i} invalid condition")
                return False
            
            # Validate deposit_pct is string
            deposit_pct = lvl.get("deposit_pct")
            if not isinstance(deposit_pct, str):
                log_error(f"Level {i} has invalid deposit_pct: {deposit_pct}")
                test_results["failed"].append(f"GET /api/color-scale - level {i} invalid deposit_pct")
                return False
            
            # Validate grade is string
            grade = lvl.get("grade")
            if not isinstance(grade, str) or not grade:
                log_error(f"Level {i} has invalid grade: {grade}")
                test_results["failed"].append(f"GET /api/color-scale - level {i} invalid grade")
                return False
            
            # Validate status is PASS or FAIL
            status = lvl.get("status")
            if status not in ["PASS", "FAIL"]:
                log_error(f"Level {i} has invalid status: {status} (expected PASS or FAIL)")
                test_results["failed"].append(f"GET /api/color-scale - level {i} invalid status")
                return False
            
            # Verify convention: level 0 = FAIL (darkest/worst), level 10 = PASS (clear/best)
            # Levels 0-6 should be FAIL, 7-10 should be PASS
            expected_status = "PASS" if level_num >= 7 else "FAIL"
            if status != expected_status:
                log_error(f"Level {level_num} has status '{status}', expected '{expected_status}'")
                test_results["failed"].append(f"GET /api/color-scale - level {level_num} wrong status")
                return False
        
        # Log sample levels
        log_info("Sample levels:")
        log_detail("  Level 0 (darkest/worst)", f"{levels[0]['name']} - {levels[0]['status']}")
        log_detail("  Level 5 (mid)", f"{levels[5]['name']} - {levels[5]['status']}")
        log_detail("  Level 10 (clear/best)", f"{levels[10]['name']} - {levels[10]['status']}")
        
        log_success("Color scale endpoint structure validated: 11 levels, proper statuses, base64 image")
        test_results["passed"].append("GET /api/color-scale - structure validated")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/color-scale - {str(e)}")
        return False

# ============================================================================
# TEST 2: AI analyze still works with two-image comparison
# ============================================================================
def test_upload_image():
    """Test POST /api/upload with color_scale.jpg"""
    log_test("TEST 2.1: POST /api/upload - Upload Test Image")
    try:
        if not Path(TEST_IMAGE_PATH).exists():
            log_error(f"Test image not found: {TEST_IMAGE_PATH}")
            test_results["failed"].append("POST /api/upload - test image missing")
            return None
        
        with open(TEST_IMAGE_PATH, "rb") as f:
            files = {"file": ("color_scale.jpg", f, "image/jpeg")}
            resp = requests.post(f"{BACKEND_URL}/upload", files=files, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            if "image_path" in data and data["image_path"]:
                log_success(f"Image uploaded successfully")
                log_detail("image_path", data["image_path"])
                test_results["passed"].append("POST /api/upload - image upload")
                return data["image_path"]
            else:
                log_error("Response missing 'image_path' field")
                test_results["failed"].append("POST /api/upload - missing image_path")
                return None
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"POST /api/upload - status {resp.status_code}")
            return None
    except Exception as e:
        log_error(f"Upload failed: {e}")
        test_results["failed"].append(f"POST /api/upload - {str(e)}")
        return None

def test_analyze_image(image_path):
    """Test POST /api/analyze with Gemini vision (two-image comparison, can take ~60s)"""
    log_test("TEST 2.2: POST /api/analyze - AI Vision Analysis with Two-Image Comparison")
    log_info("This may take up to 60 seconds for live Gemini API call...")
    log_info("Gemini receives TWO images: Nikko reference board + sample tube")
    
    try:
        payload = {
            "image_path": image_path,
            "sample_id": TEST_SAMPLE_ID,
            "oil_type": TEST_OIL_TYPE,
            "batch": TEST_BATCH,
            "operator": TEST_OPERATOR
        }
        
        start_time = time.time()
        resp = requests.post(f"{BACKEND_URL}/analyze", json=payload, timeout=120)
        elapsed = time.time() - start_time
        
        log_info(f"Analysis completed in {elapsed:.1f}s")
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Validate required fields
            required_fields = ["id", "rating", "performance", "status", "parameters", "ai_summary", "ai_model"]
            missing = [f for f in required_fields if f not in data]
            if missing:
                log_error(f"Missing required fields: {missing}")
                test_results["failed"].append(f"POST /api/analyze - missing fields: {missing}")
                return None
            
            # Validate rating is numeric 0-10
            rating = data.get("rating")
            if not isinstance(rating, (int, float)) or rating < 0 or rating > 10:
                log_error(f"Invalid rating: {rating} (expected 0-10)")
                test_results["failed"].append(f"POST /api/analyze - invalid rating {rating}")
                return None
            
            # Validate status is PASS or FAIL
            status = data.get("status")
            if status not in ["PASS", "FAIL"]:
                log_error(f"Invalid status: {status} (expected PASS or FAIL)")
                test_results["failed"].append(f"POST /api/analyze - invalid status {status}")
                return None
            
            # Validate ai_model
            ai_model = data.get("ai_model")
            if ai_model != "gemini-3.1-pro-preview":
                log_error(f"Unexpected ai_model: {ai_model}")
                test_results["failed"].append(f"POST /api/analyze - wrong ai_model {ai_model}")
                return None
            
            # Validate ai_summary is non-empty
            ai_summary = data.get("ai_summary", "")
            if not ai_summary or len(ai_summary.strip()) == 0:
                log_error("ai_summary is empty")
                test_results["failed"].append("POST /api/analyze - empty ai_summary")
                return None
            
            # Validate parameters object has expected numeric keys
            params = data.get("parameters", {})
            expected_param_keys = [
                "deposit_area_pct", "deposit_length_mm", "deposit_coverage_pct",
                "avg_intensity_l", "avg_color_a", "avg_color_b", "max_intensity",
                "thickness_index_mm", "deposit_start_mm", "deposit_end_mm"
            ]
            missing_params = [k for k in expected_param_keys if k not in params]
            if missing_params:
                log_error(f"Missing parameter keys: {missing_params}")
                test_results["failed"].append(f"POST /api/analyze - missing params: {missing_params}")
                return None
            
            # All validations passed
            log_success("AI Vision analysis successful with two-image comparison")
            log_detail("Test ID", data["id"])
            log_detail("Rating", f"{rating}/10")
            log_detail("Performance", data.get("performance"))
            log_detail("Status", status)
            log_detail("AI Model", ai_model)
            log_detail("AI Summary", ai_summary[:100] + "..." if len(ai_summary) > 100 else ai_summary)
            log_detail("Confidence", data.get("confidence"))
            log_detail("Deposit Level", data.get("deposit_level_label"))
            
            test_results["passed"].append("POST /api/analyze - two-image comparison works")
            return data["id"]
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"POST /api/analyze - status {resp.status_code}")
            return None
    except requests.Timeout:
        log_error("Request timed out after 120s")
        test_results["failed"].append("POST /api/analyze - timeout")
        return None
    except Exception as e:
        log_error(f"Analysis failed: {e}")
        test_results["failed"].append(f"POST /api/analyze - {str(e)}")
        return None

# ============================================================================
# TEST 3: Regression tests
# ============================================================================
def test_api_root():
    """Test GET /api/ returns API message"""
    log_test("TEST 3.1: GET /api/ - API Root")
    try:
        resp = requests.get(f"{BACKEND_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "message" in data:
                log_success(f"API root accessible: {data['message']}")
                test_results["passed"].append("GET /api/ - API root")
                return True
            else:
                log_error("Response missing 'message' field")
                test_results["failed"].append("GET /api/ - missing message field")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}")
            test_results["failed"].append(f"GET /api/ - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/ - {str(e)}")
        return False

def test_dashboard():
    """Test GET /api/dashboard"""
    log_test("TEST 3.2: GET /api/dashboard - Dashboard Stats")
    try:
        resp = requests.get(f"{BACKEND_URL}/dashboard", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required = ["total", "passed", "failed", "avg_rating"]
            missing = [f for f in required if f not in data]
            if missing:
                log_error(f"Missing fields: {missing}")
                test_results["failed"].append(f"GET /api/dashboard - missing fields: {missing}")
                return None
            
            log_success("Dashboard data retrieved")
            log_detail("Total Tests", data.get("total"))
            log_detail("Passed", data.get("passed"))
            log_detail("Failed", data.get("failed"))
            log_detail("Avg Rating", data.get("avg_rating"))
            test_results["passed"].append("GET /api/dashboard - stats")
            return data.get("total")
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/dashboard - status {resp.status_code}")
            return None
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/dashboard - {str(e)}")
        return None

def test_list_tests():
    """Test GET /api/tests"""
    log_test("TEST 3.3: GET /api/tests - List Tests")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if not isinstance(data, list):
                log_error(f"Expected list, got {type(data)}")
                test_results["failed"].append("GET /api/tests - not a list")
                return None
            
            log_success(f"Test list retrieved ({len(data)} records)")
            test_results["passed"].append("GET /api/tests - list tests")
            return data
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests - status {resp.status_code}")
            return None
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests - {str(e)}")
        return None

def test_trend():
    """Test GET /api/trend"""
    log_test("TEST 3.4: GET /api/trend - Trend Data")
    try:
        resp = requests.get(f"{BACKEND_URL}/trend", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if not isinstance(data, list):
                log_error(f"Expected list, got {type(data)}")
                test_results["failed"].append("GET /api/trend - not a list")
                return False
            
            log_success(f"Trend data retrieved ({len(data)} records)")
            test_results["passed"].append("GET /api/trend - trend data")
            return True
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/trend - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/trend - {str(e)}")
        return False

def test_get_test_by_id(test_id):
    """Test GET /api/tests/{id} retrieves a seeded record"""
    log_test(f"TEST 3.5: GET /api/tests/{test_id} - Retrieve Test Record")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests/{test_id}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("id") == test_id:
                log_success(f"Test record retrieved successfully")
                log_detail("Sample ID", data.get("meta", {}).get("sample_id"))
                log_detail("Rating", data.get("rating"))
                log_detail("Status", data.get("status"))
                test_results["passed"].append(f"GET /api/tests/{test_id} - retrieve record")
                return True
            else:
                log_error(f"ID mismatch: expected {test_id}, got {data.get('id')}")
                test_results["failed"].append(f"GET /api/tests/{test_id} - ID mismatch")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests/{test_id} - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests/{test_id} - {str(e)}")
        return False

def test_delete_nonexistent():
    """Test DELETE /api/tests/{id} with non-existent ID returns 404"""
    log_test("TEST 3.6: DELETE /api/tests/nonexistent - 404 for Non-existent ID")
    fake_id = "00000000-0000-0000-0000-000000000000"
    try:
        resp = requests.delete(f"{BACKEND_URL}/tests/{fake_id}", timeout=10)
        if resp.status_code == 404:
            log_success("Non-existent ID returns 404 as expected")
            test_results["passed"].append("DELETE /api/tests/nonexistent - 404")
            return True
        else:
            log_error(f"Expected 404, got {resp.status_code}")
            test_results["failed"].append(f"DELETE /api/tests/nonexistent - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"DELETE /api/tests/nonexistent - {str(e)}")
        return False

def test_delete_created_record(test_id):
    """Test DELETE /api/tests/{id} for cleanup"""
    log_test(f"CLEANUP: DELETE /api/tests/{test_id} - Delete Created Test Record")
    try:
        resp = requests.delete(f"{BACKEND_URL}/tests/{test_id}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True:
                log_success("Created test record deleted (cleanup)")
                test_results["passed"].append(f"DELETE /api/tests/{test_id} - cleanup")
                return True
            else:
                log_error(f"Expected {{ok: true}}, got {data}")
                test_results["failed"].append(f"DELETE /api/tests/{test_id} - unexpected response")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"DELETE /api/tests/{test_id} - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"DELETE /api/tests/{test_id} - {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    total = len(test_results["passed"]) + len(test_results["failed"])
    print(f"\nTotal Tests: {total}")
    print(f"{GREEN}Passed: {len(test_results['passed'])}{RESET}")
    print(f"{RED}Failed: {len(test_results['failed'])}{RESET}")
    
    if test_results["passed"]:
        print(f"\n{GREEN}✓ Passed Tests:{RESET}")
        for test in test_results["passed"]:
            print(f"  {GREEN}✓{RESET} {test}")
    
    if test_results["failed"]:
        print(f"\n{RED}✗ Failed Tests:{RESET}")
        for test in test_results["failed"]:
            print(f"  {RED}✗{RESET} {test}")
    
    if test_results["warnings"]:
        print(f"\n{YELLOW}⚠ Warnings:{RESET}")
        for warning in test_results["warnings"]:
            print(f"  {YELLOW}⚠{RESET} {warning}")
    
    print(f"\n{BLUE}{'='*80}{RESET}\n")
    
    return len(test_results["failed"]) == 0

def main():
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}KHT AI VISION - Nikko Color Scale Feature Verification{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Image: {TEST_IMAGE_PATH}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # ========================================================================
    # TEST 1: NEW endpoint GET /api/color-scale
    # ========================================================================
    log_info("=== TEST 1: Nikko Color Scale Endpoint ===")
    test_color_scale_endpoint()
    
    # ========================================================================
    # TEST 2: AI analyze still works with two-image comparison
    # ========================================================================
    log_info("\n=== TEST 2: AI Analyze with Two-Image Comparison ===")
    
    # Upload image
    image_path = test_upload_image()
    if not image_path:
        log_error("Cannot proceed without uploaded image")
        print_summary()
        return 1
    
    # Analyze image (Gemini vision - can take ~60s)
    test_id = test_analyze_image(image_path)
    if not test_id:
        log_error("Cannot proceed without analysis result")
        print_summary()
        return 1
    
    # ========================================================================
    # TEST 3: Regression tests
    # ========================================================================
    log_info("\n=== TEST 3: Regression Tests ===")
    
    # Test API root
    test_api_root()
    
    # Test dashboard
    test_dashboard()
    
    # Test list tests
    tests_list = test_list_tests()
    
    # Test trend
    test_trend()
    
    # Test get test by ID (use first seeded record)
    if tests_list and len(tests_list) > 0:
        # Find a seeded record (not our test record)
        seeded_record = None
        for t in tests_list:
            if t.get("id") != test_id:
                seeded_record = t
                break
        if seeded_record:
            test_get_test_by_id(seeded_record["id"])
    
    # Test delete non-existent
    test_delete_nonexistent()
    
    # ========================================================================
    # CLEANUP: Delete the test record we created
    # ========================================================================
    log_info("\n=== CLEANUP: Delete Created Test Record ===")
    test_delete_created_record(test_id)
    
    # Print summary
    success = print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
