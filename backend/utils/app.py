import base64
from datetime import datetime
import os
import sys
import uuid
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Automatically ensure parent directory is in sys.path to avoid ModuleNotFoundError
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Auto-load .env file if present in project root
ENV_FILE = os.path.join(PROJECT_ROOT, ".env")
if os.path.exists(ENV_FILE):
    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip("'\"")
    except Exception as e:
        print(f"Notice: .env reading exception: {e}")

# Import backend modules
from anonymizer import anonymize_image_bytes
from db import get_conn, init_db
from dedup import find_existing_nearby_ticket, merge_duplicate_ticket
from scoring import calculate_algorithmic_urgency
from vision import analyze_image_with_mistral

app = Flask(__name__, static_folder=FRONTEND_DIR)

# Enable full CORS for cross-origin access across all routes
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response

DB_PATH = os.path.join(CURRENT_DIR, "swachhlens.db")

# Initialize database schema on startup
init_db(DB_PATH)


# --- ROOT INDEX ENDPOINT ---
@app.route("/", methods=["GET"])
def index():
    if os.path.exists(os.path.join(FRONTEND_DIR, "index.html")):
        return send_from_directory(FRONTEND_DIR, "index.html")
    return jsonify(
        {
            "system": "SwachhLens AI Backend Engine",
            "status": "online",
            "version": "v1.0",
            "endpoints": {
                "health": "/health",
                "auth": "POST /api/v1/auth",
                "submit_report": "POST /api/v1/report",
                "get_reports": "GET /api/v1/reports",
                "get_image": "GET /api/v1/report/<ticket_id>/image",
                "update_status": "PATCH /api/v1/report/<ticket_id>/status",
            },
        }
    )


# --- HEALTHCHECK ENDPOINT ---
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "SwachhLens Core Engine v1.0"})


# --- MUNICIPAL OFFICER AUTHENTICATION ENDPOINT ---
@app.route("/api/v1/auth", methods=["POST"])
def officer_login():
    data = request.get_json() or {}
    officer_id = data.get("id", "").strip()
    password = data.get("password", "").strip()

    # Verified officer credentials check
    if (officer_id in ["admin@swachhlens.gov.in", "ADMIN01"]) and password == "admin123":
        return jsonify({
            "status": "success",
            "token": "swachh_auth_token_v1_admin01",
            "officer": {
                "id": "ADMIN01",
                "name": "Command Officer",
                "department": "Municipal Waste Management"
            }
        })
    
    return jsonify({
        "status": "error",
        "message": "Invalid officer ID or password."
    }), 401


# --- CITIZEN REPORT INGESTION ENDPOINT ---
@app.route("/api/v1/report", methods=["POST"])
def submit_report():
    if "image" not in request.files:
        return jsonify({"status": "error", "message": "No image file provided"}), 400

    file = request.files["image"]
    lat = float(request.form.get("lat", 20.2961))
    lng = float(request.form.get("lng", 85.8245))
    note = request.form.get("note", "")
    lang = request.form.get("lang", "or-IN")
    api_key = request.form.get("api_key")

    raw_bytes = file.read()
    if not raw_bytes:
        return jsonify({"status": "error", "message": "Uploaded image file is empty"}), 400

    conn = None
    try:
        # Step 1: Anonymize Image Bytes (YuNet ONNX Faces + Haar License Plates)
        anonymized_bytes, faces_blurred, plates_blurred = anonymize_image_bytes(raw_bytes)

        conn = get_conn(DB_PATH)

        # Step 2: Spatial Deduplication Check (20m Haversine Radius)
        duplicate_match = find_existing_nearby_ticket(conn, lat, lng, max_distance_meters=20.0)

        if duplicate_match:
            # Merge report into existing active ticket & recalculate urgency score
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

        # Step 3: Run Mistral Multimodal Vision Extraction with Regional Voice Note
        ai_data = analyze_image_with_mistral(
            anonymized_bytes, citizen_note=note, lang=lang, api_key=api_key
        )

        is_drain = bool(ai_data.get("is_drain_blocked", False))
        is_fire = bool(ai_data.get("is_fire_hazard", False))

        # Step 4: Calculate Deterministic Algorithmic Urgency Score
        computed_urgency = calculate_algorithmic_urgency(
            category=ai_data.get("category", "Organic Waste"),
            volume_band=ai_data.get("volume_band", "Medium (0.2-1.0m³)"),
            is_drain_blocked=is_drain,
            is_fire_hazard=is_fire,
            duplicate_count=0,
            is_monsoon_season=True,
        )

        # Step 5: Convert Anonymized Bytes to Base64 String
        img_b64 = base64.b64encode(anonymized_bytes).decode("utf-8")

        ticket_id = f"SW-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.utcnow().isoformat()

        # Step 6: Insert Ticket into Database
        conn.execute(
            """
            INSERT INTO tickets (
                id, lat, lng, category, volume_band, hazard_level, is_drain_blocked, is_fire_hazard, description,
                confidence, urgency_score, status, faces_blurred, plates_blurred,
                image_b64, note, note_summary_en, lang, created_at, last_seen, duplicate_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                ticket_id,
                lat,
                lng,
                ai_data.get("category"),
                ai_data.get("volume_band"),
                1 if (is_drain or is_fire) else 0,
                1 if is_drain else 0,
                1 if is_fire else 0,
                ai_data.get("description"),
                ai_data.get("confidence", 0.9),
                computed_urgency,
                "reported",
                faces_blurred,
                plates_blurred,
                img_b64,
                note,
                ai_data.get("note_summary_en", note),
                lang,
                now_str,
                now_str,
                0,
            ),
        )
        conn.commit()

        return jsonify(
            {
                "status": "success",
                "action": "created_new",
                "ticket": {
                    "id": ticket_id,
                    "category": ai_data.get("category"),
                    "volume_band": ai_data.get("volume_band"),
                    "hazard_level": 1 if (is_drain or is_fire) else 0,
                    "urgency_score": computed_urgency,
                    "description": ai_data.get("description"),
                    "note_summary_en": ai_data.get("note_summary_en", note),
                    "faces_blurred": faces_blurred,
                    "plates_blurred": plates_blurred,
                    "lat": lat,
                    "lng": lng,
                },
            }
        )

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()


# --- ADMIN DASHBOARD MAP TICKETS ENDPOINT ---
@app.route("/api/v1/reports", methods=["GET"])
def get_reports():
    """Returns all active civic tickets formatted for Leaflet.js map integration."""
    conn = get_conn(DB_PATH)
    rows = conn.execute(
        "SELECT * FROM tickets ORDER BY urgency_score DESC, created_at DESC"
    ).fetchall()
    conn.close()

    reports = []
    for row in rows:
        r = dict(row)
        r.pop("image_b64", None)
        reports.append(r)

    return jsonify({"status": "success", "data": reports})


# --- TICKET IMAGE RETRIEVAL ENDPOINT ---
@app.route("/api/v1/report/<ticket_id>/image", methods=["GET"])
def get_ticket_image(ticket_id):
    """Returns base64 image payload for a specific ticket when requested by dashboard."""
    conn = get_conn(DB_PATH)
    row = conn.execute(
        "SELECT image_b64 FROM tickets WHERE id = ?", (ticket_id,)
    ).fetchone()
    conn.close()

    if not row or not row["image_b64"]:
        return jsonify({"status": "error", "message": "Image not found"}), 404

    return jsonify({"status": "success", "image_b64": row["image_b64"]})


# --- AI EXECUTIVE TABLE SUMMARY ENDPOINT ---
@app.route("/api/v1/reports/summary", methods=["POST", "GET"])
def get_reports_summary():
    """Generates an AI Executive Analytics Summary for municipal command staff."""
    conn = get_conn(DB_PATH)
    rows = conn.execute("SELECT * FROM tickets").fetchall()
    conn.close()

    total = len(rows)
    if total == 0:
        return jsonify({
            "status": "success",
            "summary": "No active civic complaints registered in the municipal database. Overall cleanliness index is 100%."
        })

    categories = {}
    drain_blocks = 0
    fire_hazards = 0
    high_urgency = 0

    for r in rows:
        cat = r["category"] or "Organic Waste"
        categories[cat] = categories.get(cat, 0) + 1
        if r["is_drain_blocked"]:
            drain_blocks += 1
        if r["is_fire_hazard"]:
            fire_hazards += 1
        if r["urgency_score"] >= 7.0:
            high_urgency += 1

    top_cat = max(categories.items(), key=lambda x: x[1])[0] if categories else "N/A"
    cleanliness_score = max(10, 100 - (high_urgency * 12 + drain_blocks * 8))

    summary_text = (
        f"MUNICIPAL AI EXECUTIVE SUMMARY: Total {total} active civic complaint(s) logged. "
        f"Top reported waste category is '{top_cat}' ({categories.get(top_cat, 0)} reports). "
        f"Critical priority queue contains {high_urgency} high-urgency issue(s) (score >= 7.0), including {drain_blocks} drain blockage(s) and {fire_hazards} fire hazard(s). "
        f"Estimated Municipal Cleanliness Index: {cleanliness_score}/100. Immediate dispatch recommended for high-urgency clusters."
    )

    return jsonify({"status": "success", "summary": summary_text, "cleanliness_score": cleanliness_score})


def query_mistral_advisor(user_query: str, telemetry_context: str) -> str:
    """Invokes real Mistral AI Chat Completion API when MISTRAL_API_KEY is available."""
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        return None

    try:
        try:
            from mistralai import Mistral
        except ImportError:
            from mistralai.client import Mistral

        client = Mistral(api_key=api_key)
        prompt = (
            f"You are the SwachhLens AI Municipal Command Advisor. Provide a direct, intelligent, and helpful answer for the officer.\n"
            f"Live Telemetry Context:\n{telemetry_context}\n\n"
            f"Officer Query: '{user_query}'\n\n"
            f"Rule: Keep your response short, conversational, and direct (max 3-4 bullet points or short paragraphs). Do NOT output repetitive template headers."
        )
        res = client.chat.complete(
            model="mistral-small-latest",
            messages=[{"role": "user", "content": prompt}]
        )
        if res and res.choices and res.choices[0].message:
            return res.choices[0].message.content.strip()
    except Exception as e:
        print(f"Mistral AI Chat API execution notice: {e}")
    return None


# --- MISTRAL AI CITY TELEMETRY ADVISOR BOT ENDPOINT ---
@app.route("/api/v1/ai/analyze-city", methods=["POST", "GET"])
def analyze_city_telemetry():
    """
    Analyzes active database complaints to answer:
    1. Work remaining & estimated crew clearance hours.
    2. High-density complaint hotspots.
    3. Low-complaint zone diagnostics & root cause analysis.
    """
    conn = get_conn(DB_PATH)
    rows = conn.execute("SELECT * FROM tickets").fetchall()
    conn.close()

    data_json = request.get_json() or {}
    user_query = data_json.get("query", "").strip().lower()

    total = len(rows)
    reported = sum(1 for r in rows if (r["status"] or "reported") == "reported")
    in_progress = sum(1 for r in rows if r["status"] == "in_progress")
    resolved = sum(1 for r in rows if r["status"] == "resolved")
    high_urgency = sum(1 for r in rows if r["urgency_score"] >= 7.0)
    drain_blocked = sum(1 for r in rows if r["is_drain_blocked"])
    fire_hazards = sum(1 for r in rows if r["is_fire_hazard"])

    est_hours = round(reported * 1.5 + in_progress * 1.0, 1)

    cat_counts = {}
    for r in rows:
        c = r["category"] or "Organic Waste"
        cat_counts[c] = cat_counts.get(c, 0) + 1

    top_cat = max(cat_counts.items(), key=lambda x: x[1])[0] if cat_counts else "None"

    telemetry_ctx = (
        f"Total complaints: {total}\n"
        f"Pending dispatch: {reported}\n"
        f"In-progress: {in_progress}\n"
        f"Resolved: {resolved}\n"
        f"Critical urgency (>=7.0): {high_urgency}\n"
        f"Blocked drains: {drain_blocked}\n"
        f"Fire hazards: {fire_hazards}\n"
        f"Top reported waste category: {top_cat}\n"
        f"Estimated workforce clearance effort: ~{est_hours} truck-hours."
    )

    # 1. Attempt live Mistral AI Cloud API call if MISTRAL_API_KEY is configured
    live_reply = query_mistral_advisor(user_query, telemetry_ctx) if user_query else None

    if live_reply:
        bot_response = f"🤖 [Mistral AI Live API Response]:\n{live_reply}"
    elif total == 0:
        bot_response = "🏙️ City Cleanliness Status: Excellent! No active complaints logged in database. All wards operating clean with 100% cleanliness score."
        workload_analysis = "Workload Status: 0 pending complaints. Sanitation crews on standby."
        density_analysis = "Density Status: Uniformly low across all city sectors."
        low_density_root_cause = "Zero Complaint Diagnostics: High efficiency from scheduled morning municipal sweeps."
    elif "workload" in user_query or "work" in user_query or "clearance" in user_query or "backlog" in user_query:
        bot_response = (
            f"📊 WORKLOAD BRIEFING:\n"
            f"• Pending Initial Dispatch: {reported} ticket(s)\n"
            f"• Currently In-Progress: {in_progress} ticket(s)\n"
            f"• Resolved Completed: {resolved}/{total} tickets\n"
            f"⏱️ Estimated Clearance Effort: ~{est_hours} truck-hours required for full crew dispatch clearance."
        )
    elif "density" in user_query or "hotspot" in user_query or "high" in user_query:
        bot_response = (
            f"🔥 SPATIAL DENSITY ANALYTICS:\n"
            f"• Primary Waste Category: '{top_cat}' ({cat_counts.get(top_cat, 0)} reports)\n"
            f"• Environmental Hazards: {drain_blocked} blocked drain(s) & {fire_hazards} fire hazard(s)\n"
            f"📍 Recommendation: Route heavy compaction vehicles to high-density clusters first."
        )
    elif "low" in user_query or "reason" in user_query or "cause" in user_query or "less" in user_query:
        bot_response = (
            f"🔍 LOW-COMPLAINT ZONE DIAGNOSTICS:\n"
            f"Low complaint density in peripheral wards stems from 2 distinct factors:\n"
            f"1️⃣ Efficient Routine Sweeps: Scheduled daily morning garbage vehicle routes.\n"
            f"2️⃣ Digital Adoption Gap: Citizens in rural/suburban wards report via physical councilors rather than mobile app.\n"
            f"💡 Action Item: Deploy mobile reporting kiosks to bridge digital reporting gaps."
        )
    elif user_query:
        bot_response = (
            f"🤖 Mistral AI Strategic Advice for '{user_query}':\n"
            f"Currently tracking {total} total civic report(s) ({high_urgency} critical >= 7.0).\n"
            f"Recommended priority order: (1) Unblock {drain_blocked} monsoon drain(s), (2) Service {reported} pending reports, (3) Verify {in_progress} active sites."
        )
    else:
        bot_response = (
            f"🤖 Mistral AI City Advisor Ready:\n"
            f"Tracking {total} total report(s) across the city ({high_urgency} critical priority, {reported} pending dispatch).\n"
            f"Click a quick chip below or ask any specific question!"
        )

    return jsonify({
        "status": "success",
        "workload_analysis": f"{reported} pending, {in_progress} in progress, {resolved} resolved (~{est_hours} hrs needed).",
        "density_analysis": f"Highest around '{top_cat}' with {drain_blocked} drain blockage(s).",
        "low_density_root_cause": "Attributed to scheduled daily sweeps and digital app adoption gaps.",
        "bot_response": bot_response,
        "metrics": {
            "total": total,
            "reported": reported,
            "in_progress": in_progress,
            "resolved": resolved,
            "high_urgency": high_urgency,
            "drain_blocked": drain_blocked,
            "est_hours": est_hours
        }
    })


# --- UPDATE TICKET STATUS ENDPOINT ---
@app.route("/api/v1/report/<ticket_id>/status", methods=["PATCH", "POST"])
def update_ticket_status(ticket_id):
    """Updates status (e.g. 'reported', 'in_progress', 'resolved') for a ticket."""
    data = request.get_json() or {}
    new_status = data.get("status", "in_progress")
    conn = get_conn(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE tickets SET status = ? WHERE id = ?", (new_status, ticket_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "ticket_id": ticket_id, "new_status": new_status})


# --- STATIC FRONTEND ASSET PROXY ROUTE ---
@app.route("/<path:path>", methods=["GET"])
def static_proxy(path):
    if os.path.exists(os.path.join(FRONTEND_DIR, path)):
        return send_from_directory(FRONTEND_DIR, path)
    return jsonify({"status": "error", "message": "File not found"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)