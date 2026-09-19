#!/usr/bin/env python3
"""
KHT AI VISION Backend API Test Suite - Edit Analysis Result Feature
Tests the new PUT /api/tests/{id} endpoint for editing analysis results before PDF export
"""
import os
import sys
import requests

# Backend URL from frontend/.env
BACKEND_URL = "https://elastic-analyst.preview.emergentagent.com/api"

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

# Store original values for cleanup
original_values = {}

# ============================================================================
# TEST 1: GET /api/tests - Pick one seeded record and store original values
# ============================================================================
def test_get_seeded_record():
    """Get list of tests and pick one seeded record, store its original values"""
    log_test("TEST 1: GET /api/tests - Pick One Seeded Record")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests", timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests - status {resp.status_code}")
            return None
        
        data = resp.json()
        
        if not isinstance(data, list) or len(data) == 0:
            log_error(f"Expected non-empty list, got {type(data)} with {len(data) if isinstance(data, list) else 0} items")
            test_results["failed"].append("GET /api/tests - empty or invalid response")
            return None
        
        # Pick the first record
        record = data[0]
        test_id = record.get("id")
        
        if not test_id:
            log_error("Record missing 'id' field")
            test_results["failed"].append("GET /api/tests - record missing id")
            return None
        
        # Store original values for cleanup
        original_values["id"] = test_id
        original_values["rating"] = record.get("rating")
        original_values["ai_summary"] = record.get("ai_summary")
        original_values["recommendation"] = record.get("recommendation", "")
        original_values["status"] = record.get("status")
        
        log_success(f"Selected seeded record for testing")
        log_detail("Test ID", test_id)
        log_detail("Original Rating", original_values["rating"])
        log_detail("Original Status", original_values["status"])
        log_detail("Original AI Summary", original_values["ai_summary"][:80] + "..." if len(str(original_values["ai_summary"])) > 80 else original_values["ai_summary"])
        log_detail("Original Recommendation", original_values["recommendation"] if original_values["recommendation"] else "(empty)")
        
        test_results["passed"].append("GET /api/tests - selected seeded record")
        return test_id
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests - {str(e)}")
        return None

# ============================================================================
# TEST 2: PUT /api/tests/{id} with rating 4.2 - expect FAIL status
# ============================================================================
def test_update_rating_fail(test_id):
    """Test PUT /api/tests/{id} with rating 4.2, expect status FAIL"""
    log_test("TEST 2: PUT /api/tests/{id} with rating=4.2 - Expect FAIL Status")
    try:
        payload = {"rating": 4.2}
        resp = requests.put(f"{BACKEND_URL}/tests/{test_id}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=4.2 - status {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Validate rating
        rating = data.get("rating")
        if rating != 4.2:
            log_error(f"Expected rating 4.2, got {rating}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=4.2 - wrong rating {rating}")
            return False
        
        # Validate status (should be FAIL since rating < 7)
        status = data.get("status")
        if status != "FAIL":
            log_error(f"Expected status FAIL (rating < 7), got {status}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=4.2 - wrong status {status}")
            return False
        
        # Validate edited flag
        edited = data.get("edited")
        if edited != True:
            log_error(f"Expected edited=true, got {edited}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=4.2 - edited not true")
            return False
        
        # Validate edited_at is non-null
        edited_at = data.get("edited_at")
        if not edited_at or edited_at is None:
            log_error(f"Expected non-null edited_at, got {edited_at}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=4.2 - edited_at is null")
            return False
        
        log_success("Rating updated to 4.2, status auto-recomputed to FAIL")
        log_detail("Rating", rating)
        log_detail("Status", status)
        log_detail("Edited", edited)
        log_detail("Edited At", edited_at)
        
        test_results["passed"].append("PUT /api/tests/{id} rating=4.2 - FAIL status")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"PUT /api/tests/{test_id} rating=4.2 - {str(e)}")
        return False

# ============================================================================
# TEST 3: PUT /api/tests/{id} with rating 8.0 - expect PASS status
# ============================================================================
def test_update_rating_pass(test_id):
    """Test PUT /api/tests/{id} with rating 8.0, expect status PASS"""
    log_test("TEST 3: PUT /api/tests/{id} with rating=8.0 - Expect PASS Status")
    try:
        payload = {"rating": 8.0}
        resp = requests.put(f"{BACKEND_URL}/tests/{test_id}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=8.0 - status {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Validate rating
        rating = data.get("rating")
        if rating != 8.0:
            log_error(f"Expected rating 8.0, got {rating}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=8.0 - wrong rating {rating}")
            return False
        
        # Validate status (should be PASS since rating >= 7)
        status = data.get("status")
        if status != "PASS":
            log_error(f"Expected status PASS (rating >= 7), got {status}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=8.0 - wrong status {status}")
            return False
        
        log_success("Rating updated to 8.0, status auto-recomputed to PASS")
        log_detail("Rating", rating)
        log_detail("Status", status)
        
        test_results["passed"].append("PUT /api/tests/{id} rating=8.0 - PASS status")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"PUT /api/tests/{test_id} rating=8.0 - {str(e)}")
        return False

# ============================================================================
# TEST 4: PUT /api/tests/{id} with rating 15 - expect clamped to 10.0
# ============================================================================
def test_update_rating_clamped(test_id):
    """Test PUT /api/tests/{id} with rating 15, expect clamped to 10.0"""
    log_test("TEST 4: PUT /api/tests/{id} with rating=15 - Expect Clamped to 10.0")
    try:
        payload = {"rating": 15}
        resp = requests.put(f"{BACKEND_URL}/tests/{test_id}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=15 - status {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Validate rating is clamped to 10.0
        rating = data.get("rating")
        if rating != 10.0:
            log_error(f"Expected rating clamped to 10.0, got {rating}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=15 - not clamped, got {rating}")
            return False
        
        # Validate status (should be PASS since rating >= 7)
        status = data.get("status")
        if status != "PASS":
            log_error(f"Expected status PASS (rating >= 7), got {status}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} rating=15 - wrong status {status}")
            return False
        
        log_success("Rating 15 clamped to 10.0, status PASS")
        log_detail("Rating", rating)
        log_detail("Status", status)
        
        test_results["passed"].append("PUT /api/tests/{id} rating=15 - clamped to 10.0")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"PUT /api/tests/{test_id} rating=15 - {str(e)}")
        return False

# ============================================================================
# TEST 5: PUT /api/tests/{id} with ai_summary and recommendation
# ============================================================================
def test_update_summary_recommendation(test_id):
    """Test PUT /api/tests/{id} with ai_summary and recommendation"""
    log_test("TEST 5: PUT /api/tests/{id} with ai_summary and recommendation")
    try:
        test_summary = "Deskripsi kondisi manual QA"
        test_recommendation = "Ganti oli dalam 250 jam"
        
        payload = {
            "ai_summary": test_summary,
            "recommendation": test_recommendation
        }
        resp = requests.put(f"{BACKEND_URL}/tests/{test_id}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} summary+recommendation - status {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Validate ai_summary
        ai_summary = data.get("ai_summary")
        if ai_summary != test_summary:
            log_error(f"Expected ai_summary '{test_summary}', got '{ai_summary}'")
            test_results["failed"].append(f"PUT /api/tests/{test_id} - ai_summary mismatch")
            return False
        
        # Validate recommendation
        recommendation = data.get("recommendation")
        if recommendation != test_recommendation:
            log_error(f"Expected recommendation '{test_recommendation}', got '{recommendation}'")
            test_results["failed"].append(f"PUT /api/tests/{test_id} - recommendation mismatch")
            return False
        
        # Validate edited flag
        edited = data.get("edited")
        if edited != True:
            log_error(f"Expected edited=true, got {edited}")
            test_results["failed"].append(f"PUT /api/tests/{test_id} - edited not true")
            return False
        
        log_success("AI summary and recommendation updated successfully")
        log_detail("AI Summary", ai_summary)
        log_detail("Recommendation", recommendation)
        log_detail("Edited", edited)
        
        test_results["passed"].append("PUT /api/tests/{id} - ai_summary and recommendation")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"PUT /api/tests/{test_id} summary+recommendation - {str(e)}")
        return False

# ============================================================================
# TEST 6: GET /api/tests/{id} - Confirm persistence
# ============================================================================
def test_get_updated_record(test_id):
    """Test GET /api/tests/{id} to confirm values persist"""
    log_test("TEST 6: GET /api/tests/{id} - Confirm Persistence")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests/{test_id}", timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests/{test_id} persistence - status {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Validate the values from TEST 5 persist
        expected_summary = "Deskripsi kondisi manual QA"
        expected_recommendation = "Ganti oli dalam 250 jam"
        expected_rating = 10.0  # From TEST 4
        
        ai_summary = data.get("ai_summary")
        recommendation = data.get("recommendation")
        rating = data.get("rating")
        edited = data.get("edited")
        
        errors = []
        
        if ai_summary != expected_summary:
            errors.append(f"ai_summary mismatch: expected '{expected_summary}', got '{ai_summary}'")
        
        if recommendation != expected_recommendation:
            errors.append(f"recommendation mismatch: expected '{expected_recommendation}', got '{recommendation}'")
        
        if rating != expected_rating:
            errors.append(f"rating mismatch: expected {expected_rating}, got {rating}")
        
        if edited != True:
            errors.append(f"edited flag: expected true, got {edited}")
        
        if errors:
            for error in errors:
                log_error(error)
            test_results["failed"].append(f"GET /api/tests/{test_id} - persistence check failed")
            return False
        
        log_success("All updated values persisted correctly")
        log_detail("AI Summary", ai_summary)
        log_detail("Recommendation", recommendation)
        log_detail("Rating", rating)
        log_detail("Edited", edited)
        
        test_results["passed"].append("GET /api/tests/{id} - persistence confirmed")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests/{test_id} persistence - {str(e)}")
        return False

# ============================================================================
# TEST 7: PUT /api/tests/{non-existent-uuid} - Expect 404
# ============================================================================
def test_update_nonexistent():
    """Test PUT /api/tests/{id} with non-existent UUID, expect 404"""
    log_test("TEST 7: PUT /api/tests/{non-existent-uuid} - Expect 404")
    fake_id = "00000000-0000-0000-0000-000000000000"
    try:
        payload = {"rating": 5.0}
        resp = requests.put(f"{BACKEND_URL}/tests/{fake_id}", json=payload, timeout=10)
        
        if resp.status_code != 404:
            log_error(f"Expected 404, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"PUT /api/tests/nonexistent - status {resp.status_code}")
            return False
        
        log_success("Non-existent UUID returns 404 as expected")
        test_results["passed"].append("PUT /api/tests/nonexistent - 404")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"PUT /api/tests/nonexistent - {str(e)}")
        return False

# ============================================================================
# TEST 8: REGRESSION - Confirm all other endpoints still work
# ============================================================================
def test_regression_api_root():
    """Test GET /api/ returns API message"""
    log_test("TEST 8.1: GET /api/ - API Root (Regression)")
    try:
        resp = requests.get(f"{BACKEND_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "message" in data:
                log_success(f"API root accessible: {data['message']}")
                test_results["passed"].append("GET /api/ - regression")
                return True
            else:
                log_error("Response missing 'message' field")
                test_results["failed"].append("GET /api/ - missing message")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}")
            test_results["failed"].append(f"GET /api/ - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/ - {str(e)}")
        return False

def test_regression_dashboard():
    """Test GET /api/dashboard"""
    log_test("TEST 8.2: GET /api/dashboard - Dashboard Stats (Regression)")
    try:
        resp = requests.get(f"{BACKEND_URL}/dashboard", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required = ["total", "passed", "failed", "avg_rating"]
            missing = [f for f in required if f not in data]
            if missing:
                log_error(f"Missing fields: {missing}")
                test_results["failed"].append(f"GET /api/dashboard - missing fields")
                return False
            
            log_success("Dashboard data retrieved")
            log_detail("Total Tests", data.get("total"))
            log_detail("Passed", data.get("passed"))
            log_detail("Failed", data.get("failed"))
            log_detail("Avg Rating", data.get("avg_rating"))
            test_results["passed"].append("GET /api/dashboard - regression")
            return True
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/dashboard - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/dashboard - {str(e)}")
        return False

def test_regression_tests_list():
    """Test GET /api/tests"""
    log_test("TEST 8.3: GET /api/tests - List Tests (Regression)")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if not isinstance(data, list):
                log_error(f"Expected list, got {type(data)}")
                test_results["failed"].append("GET /api/tests - not a list")
                return False
            
            log_success(f"Test list retrieved ({len(data)} records)")
            test_results["passed"].append("GET /api/tests - regression")
            return True
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests - {str(e)}")
        return False

def test_regression_trend():
    """Test GET /api/trend"""
    log_test("TEST 8.4: GET /api/trend - Trend Data (Regression)")
    try:
        resp = requests.get(f"{BACKEND_URL}/trend", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if not isinstance(data, list):
                log_error(f"Expected list, got {type(data)}")
                test_results["failed"].append("GET /api/trend - not a list")
                return False
            
            log_success(f"Trend data retrieved ({len(data)} records)")
            test_results["passed"].append("GET /api/trend - regression")
            return True
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/trend - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/trend - {str(e)}")
        return False

def test_regression_color_scale():
    """Test GET /api/color-scale"""
    log_test("TEST 8.5: GET /api/color-scale - Color Scale (Regression)")
    try:
        resp = requests.get(f"{BACKEND_URL}/color-scale", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required = ["title", "note", "image", "levels"]
            missing = [f for f in required if f not in data]
            if missing:
                log_error(f"Missing fields: {missing}")
                test_results["failed"].append(f"GET /api/color-scale - missing fields")
                return False
            
            log_success("Color scale data retrieved")
            log_detail("Title", data.get("title"))
            log_detail("Levels Count", len(data.get("levels", [])))
            test_results["passed"].append("GET /api/color-scale - regression")
            return True
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/color-scale - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/color-scale - {str(e)}")
        return False

# ============================================================================
# TEST 9: CLEANUP - Restore original values
# ============================================================================
def test_cleanup_restore_original(test_id):
    """Restore the edited record to its original values"""
    log_test("TEST 9: CLEANUP - Restore Original Values")
    try:
        payload = {
            "rating": original_values["rating"],
            "ai_summary": original_values["ai_summary"],
            "recommendation": ""
        }
        
        log_info(f"Restoring to original values:")
        log_detail("  Original Rating", original_values["rating"])
        log_detail("  Original AI Summary", original_values["ai_summary"][:80] + "..." if len(str(original_values["ai_summary"])) > 80 else original_values["ai_summary"])
        log_detail("  Original Recommendation", "(empty)")
        
        resp = requests.put(f"{BACKEND_URL}/tests/{test_id}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"CLEANUP - restore failed, status {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Verify restoration
        rating = data.get("rating")
        ai_summary = data.get("ai_summary")
        recommendation = data.get("recommendation")
        
        errors = []
        
        if rating != original_values["rating"]:
            errors.append(f"rating not restored: expected {original_values['rating']}, got {rating}")
        
        if ai_summary != original_values["ai_summary"]:
            errors.append(f"ai_summary not restored")
        
        if recommendation != "":
            errors.append(f"recommendation not cleared: got '{recommendation}'")
        
        if errors:
            for error in errors:
                log_error(error)
            test_results["failed"].append("CLEANUP - restoration verification failed")
            return False
        
        # Confirm via GET
        log_info("Confirming restoration via GET...")
        resp_get = requests.get(f"{BACKEND_URL}/tests/{test_id}", timeout=10)
        
        if resp_get.status_code != 200:
            log_error(f"GET confirmation failed: {resp_get.status_code}")
            test_results["failed"].append("CLEANUP - GET confirmation failed")
            return False
        
        data_get = resp_get.json()
        
        if data_get.get("rating") != original_values["rating"]:
            log_error(f"GET shows rating {data_get.get('rating')}, expected {original_values['rating']}")
            test_results["failed"].append("CLEANUP - GET shows wrong rating")
            return False
        
        log_success("Original values restored successfully")
        log_detail("Restored Rating", data_get.get("rating"))
        log_detail("Restored Status", data_get.get("status"))
        log_detail("Confirmed via GET", "✓")
        
        test_results["passed"].append("CLEANUP - original values restored")
        return True
        
    except Exception as e:
        log_error(f"Cleanup failed: {e}")
        test_results["failed"].append(f"CLEANUP - {str(e)}")
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
    print(f"{BLUE}KHT AI VISION - Edit Analysis Result Feature Verification{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # ========================================================================
    # TEST 1: Get seeded record and store original values
    # ========================================================================
    log_info("=== TEST 1: Select Seeded Record ===")
    test_id = test_get_seeded_record()
    if not test_id:
        log_error("Cannot proceed without a test record")
        print_summary()
        return 1
    
    # ========================================================================
    # TEST 2: Update rating to 4.2, expect FAIL status
    # ========================================================================
    log_info("\n=== TEST 2: Update Rating to 4.2 (FAIL) ===")
    test_update_rating_fail(test_id)
    
    # ========================================================================
    # TEST 3: Update rating to 8.0, expect PASS status
    # ========================================================================
    log_info("\n=== TEST 3: Update Rating to 8.0 (PASS) ===")
    test_update_rating_pass(test_id)
    
    # ========================================================================
    # TEST 4: Update rating to 15, expect clamped to 10.0
    # ========================================================================
    log_info("\n=== TEST 4: Update Rating to 15 (Clamped to 10.0) ===")
    test_update_rating_clamped(test_id)
    
    # ========================================================================
    # TEST 5: Update ai_summary and recommendation
    # ========================================================================
    log_info("\n=== TEST 5: Update AI Summary and Recommendation ===")
    test_update_summary_recommendation(test_id)
    
    # ========================================================================
    # TEST 6: Confirm persistence via GET
    # ========================================================================
    log_info("\n=== TEST 6: Confirm Persistence ===")
    test_get_updated_record(test_id)
    
    # ========================================================================
    # TEST 7: Update non-existent UUID, expect 404
    # ========================================================================
    log_info("\n=== TEST 7: Update Non-existent UUID (404) ===")
    test_update_nonexistent()
    
    # ========================================================================
    # TEST 8: REGRESSION - Confirm all other endpoints still work
    # ========================================================================
    log_info("\n=== TEST 8: Regression Tests ===")
    test_regression_api_root()
    test_regression_dashboard()
    test_regression_tests_list()
    test_regression_trend()
    test_regression_color_scale()
    
    # ========================================================================
    # TEST 9: CLEANUP - Restore original values
    # ========================================================================
    log_info("\n=== TEST 9: CLEANUP - Restore Original Values ===")
    test_cleanup_restore_original(test_id)
    
    # Print summary
    success = print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
