import base64
from datetime import datetime
import os
import uuid
from flask import Flask, jsonify, request
from flask_cors import CORS

# Import local modules
from backend.utils.anonymizer import anonymize_image_bytes
from backend.utils.db import get_conn, init_db
from backend.utils.scoring import calculate_algorithmic_urgency
from backend.utils.dedup import (
    find_existing_nearby_ticket,
    merge_duplicate_ticket,
)  # or dedup
from backend.utils.vision import analyze_image_with_mistral

app = Flask(__name__)

# Enable CORS for frontend cross-origin requests (Netlify)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_PATH = os.path.join(os.path.dirname(__file__), "swachhlens.db")

# Initialize database schema on app launch
init_db(DB_PATH)


@app.route("/", methods=["GET"])
def index():
    return jsonify(
        {
            "system": "SwachhLens AI Backend Engine",
            "status": "online",
            "version": "v1.0",
            "endpoints": {
                "health": "/health",
                "submit_report": "POST /api/v1/report",
                "get_reports": "GET /api/v1/reports",
            },
        }
    )

# --- HEALTHCHECK ENDPOINT ---
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "SwachhLens Core Engine v1.0"})


# --- CITIZEN REPORT INGESTION ENDPOINT ---
@app.route("/api/v1/report", methods=["POST"])
def submit_report():
    if "image" not in request.files:
        return jsonify({"status": "error", "message": "No image file provided"}), 400

    file = request.files["image"]
    lat = float(request.form.get("lat", 20.2961))
    lng = float(request.form.get("lng", 85.8245))
    note = request.form.get("note", "")
    lang = request.form.get("lang", "en")
    api_key = request.form.get("api_key")  # Optional key override

    raw_bytes = file.read()
    if not raw_bytes:
        return jsonify({"status": "error", "message": "Uploaded image file is empty"}), 400

    try:
        # Step 1: Anonymize Image Bytes (YuNet ONNX Faces + Haar License Plates)
        anonymized_bytes, faces_blurred, plates_blurred = anonymize_image_bytes(raw_bytes)

        conn = get_conn(DB_PATH)

        # Step 2: Check Spatial Deduplication (20m Haversine Radius)
        duplicate_match = find_existing_nearby_ticket(conn, lat, lng, max_distance_meters=20.0)

        if duplicate_match:
            # Merge report into existing ticket & recalculate algorithmic score
            merge_duplicate_ticket(conn, existing_ticket=duplicate_match)
            conn.close()

            return jsonify(
                {
                    "status": "success",
                    "action": "merged_duplicate",
                    "message": "Report matched an existing active ticket within 20m. Priority incremented.",
                    "ticket_id": duplicate_match["id"],
                }
            )

        # Step 3: Run Mistral Multimodal Vision Extraction
        ai_data = analyze_image_with_mistral(anonymized_bytes, api_key=api_key)

        # Step 4: Calculate Deterministic Algorithmic Urgency Score
        computed_urgency = calculate_algorithmic_urgency(
            category=ai_data.get("category", "Organic Waste"),
            volume_band=ai_data.get("volume_band", "Medium (0.2-1.0m³)"),
            is_drain_blocked=ai_data.get("is_drain_blocked", False),
            is_fire_hazard=ai_data.get("is_fire_hazard", False),
            duplicate_count=0,
        )

        # Step 5: Convert Anonymized Bytes to Base64
        img_b64 = base64.b64encode(anonymized_bytes).decode("utf-8")

        ticket_id = f"SW-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.utcnow().isoformat()

        # Step 6: Insert Ticket into Database
        conn.execute(
            """
            INSERT INTO tickets (
                id, lat, lng, category, volume_band, hazard_level, description,
                confidence, urgency_score, status, faces_blurred, plates_blurred,
                image_b64, note, lang, created_at, last_seen, duplicate_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                ticket_id,
                lat,
                lng,
                ai_data.get("category"),
                ai_data.get("volume_band"),
                1 if (ai_data.get("is_drain_blocked") or ai_data.get("is_fire_hazard")) else 0,
                ai_data.get("description"),
                ai_data.get("confidence", 0.9),
                computed_urgency,
                "reported",
                faces_blurred,
                plates_blurred,
                img_b64,
                note,
                lang,
                now_str,
                now_str,
                0,
            ),
        )
        conn.commit()
        conn.close()

        return jsonify(
            {
                "status": "success",
                "action": "created_new",
                "ticket": {
                    "id": ticket_id,
                    "category": ai_data.get("category"),
                    "volume_band": ai_data.get("volume_band"),
                    "hazard_level": 1 if (ai_data.get("is_drain_blocked") or ai_data.get("is_fire_hazard")) else 0,
                    "urgency_score": computed_urgency,
                    "description": ai_data.get("description"),
                    "faces_blurred": faces_blurred,
                    "plates_blurred": plates_blurred,
                    "lat": lat,
                    "lng": lng,
                },
            }
        )

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- ADMIN DASHBOARD MAP TICKETS ENDPOINT ---
@app.route("/api/v1/reports", methods=["GET"])
def get_reports():
    """Returns all active civic tickets formatted for Leaflet.js map integration."""
    conn = get_conn(DB_PATH)
    rows = conn.execute("SELECT * FROM tickets ORDER BY urgency_score DESC, created_at DESC").fetchall()
    conn.close()

    reports = []
    for row in rows:
        r = dict(row)
        # Exclude raw base64 image string from summary payload to keep network transfers lightweight
        r.pop("image_b64", None)
        reports.append(r)

    return jsonify({"status": "success", "data": reports})


# --- TICKET IMAGE RETRIEVAL ENDPOINT ---
@app.route("/api/v1/report/<ticket_id>/image", methods=["GET"])
def get_ticket_image(ticket_id):
    """Returns base64 image for a specific ticket when clicked on admin map."""
    conn = get_conn(DB_PATH)
    row = conn.execute("SELECT image_b64 FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    conn.close()

    if not row or not row["image_b64"]:
        return jsonify({"status": "error", "message": "Image not found"}), 404

    return jsonify({"status": "success", "image_b64": row["image_b64"]})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)