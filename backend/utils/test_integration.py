import os
import sys
import io
from PIL import Image

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from app import app

def run_tests():
    client = app.test_client()

    print("--- 1. Testing Health Endpoint ---")
    res = client.get("/health")
    print("Health response:", res.status_code, res.get_json())
    assert res.status_code == 200

    print("\n--- 2. Testing Officer Auth ---")
    res = client.post("/api/v1/auth", json={"id": "admin@swachhlens.gov.in", "password": "admin123"})
    print("Auth response:", res.status_code, res.get_json())
    assert res.status_code == 200

    print("\n--- 3. Creating Test Image Bytes ---")
    img = Image.new("RGB", (200, 200), color=(100, 200, 100))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()

    import random
    rand_offset = random.random() * 0.1
    test_lat = 20.2961 + rand_offset
    test_lng = 85.8245 + rand_offset

    print("\n--- 4. Submitting Citizen Report with Location Sensitivity ---")
    data = {
        "image": (io.BytesIO(img_bytes), "test.jpg"),
        "lat": str(test_lat),
        "lng": str(test_lng),
        "note": "Plastic waste overflow blocking nalla drain near hospital",
        "lang": "or-IN",
        "is_sensitive_area": "1",
        "sensitive_area_type": "School / Hospital Zone"
    }
    res = client.post("/api/v1/report", data=data, content_type='multipart/form-data')
    print("Submit response:", res.status_code, res.get_json())
    assert res.status_code == 200
    res_data = res.get_json()
    ticket_id = res_data["ticket"]["id"]
    assert "dispatch_unit" in res_data["ticket"]
    assert res_data["ticket"]["is_sensitive_area"] == 1

    print("\n--- 5. Submitting Duplicate Report (within 20m radius) ---")
    data_dup = {
        "image": (io.BytesIO(img_bytes), "test2.jpg"),
        "lat": str(test_lat + 0.00005),
        "lng": str(test_lng + 0.00005),
        "note": "Same plastic waste pile overflow",
        "lang": "or-IN"
    }
    res_dup = client.post("/api/v1/report", data=data_dup, content_type='multipart/form-data')
    print("Duplicate response:", res_dup.status_code, res_dup.get_json())
    assert res_dup.status_code == 200
    assert res_dup.get_json()["action"] == "merged_duplicate"

    print("\n--- 6. Testing Get Reports ---")
    res_reports = client.get("/api/v1/reports")
    print("Reports count:", len(res_reports.get_json()["data"]))
    assert res_reports.status_code == 200

    print("\n--- 7. Testing Get Image Payload ---")
    res_img = client.get(f"/api/v1/report/{ticket_id}/image")
    print("Image retrieval response:", res_img.status_code, "Image b64 len:", len(res_img.get_json().get("image_b64", "")))
    assert res_img.status_code == 200

    print("\n--- 8. Testing Update Status with Verification Photo ---")
    res_status = client.patch(
        f"/api/v1/report/{ticket_id}/status",
        data={"status": "resolved", "verification_image": (io.BytesIO(img_bytes), "verified.jpg")},
        content_type='multipart/form-data'
    )
    print("Update status response:", res_status.status_code, res_status.get_json())
    assert res_status.status_code == 200
    assert res_status.get_json()["has_verification"] == True

    print("\n--- 9. Testing Verification Image Retrieval ---")
    res_v_img = client.get(f"/api/v1/report/{ticket_id}/verification-image")
    print("Verification image response:", res_v_img.status_code)
    assert res_v_img.status_code == 200

    # Cleanup test ticket created during test run so database stays clean
    from db import get_conn, DB_PATH
    conn = get_conn(DB_PATH)
    conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
    conn.commit()
    conn.close()

    print("\nALL INTEGRATION TESTS PASSED SUCCESSFULLY & DATABASE CLEANED!")

if __name__ == "__main__":
    run_tests()

