import base64
from datetime import datetime
import json
import os
import sys
import uuid
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

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
        pass

try:
    from mistralai import Mistral
except ImportError:
    try:
        from mistralai.client import Mistral
    except ImportError:
        Mistral = None

from anonymizer import anonymize_image_bytes
from db import get_conn, init_db
from dedup import find_existing_nearby_ticket, merge_duplicate_ticket
from scoring import calculate_algorithmic_urgency, check_municipal_jurisdiction
from vision import analyze_image_with_mistral
from firebase_db import (
    save_ticket, get_all_tickets, get_ticket, update_ticket_status as update_ticket_status_fs,
    find_existing_nearby_ticket_fs, merge_duplicate_ticket_fs, delete_ticket_fs
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response

DB_PATH = os.path.join(CURRENT_DIR, "swachhlens.db")
init_db(DB_PATH)


@app.route("/", methods=["GET"])
def index():
    return jsonify(
        {
            "system": "SwachhLens Core API Engine",
            "status": "online",
            "version": "v1.0",
            "frontend_portal": "https://swatchlensupworlddev.netlify.app",
            "endpoints": {
                "health": "GET /health",
                "auth": "POST /api/v1/auth",
                "submit_report": "POST /api/v1/report",
                "get_reports": "GET /api/v1/reports",
                "get_image": "GET /api/v1/report/<ticket_id>/image",
                "update_status": "PATCH /api/v1/report/<ticket_id>/status",
                "ai_summary": "POST /api/v1/reports/summary",
                "ai_analyze_city": "POST /api/v1/ai/analyze-city",
            },
        }
    )


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "SwachhLens Core Service"})


ODIA_FAST_MAP = {
    "aborjana": "ଅବର୍ଜନା",
    "kuda": "କୁଡ଼ା",
    "nalla": "ନାଳ",
    "dustbin": "ଡଷ୍ଟବିନ୍",
    "safai": "ସଫା",
    "drain": "ନାଳି",
    "block": "ବ୍ଲକ",
    "water": "ପାଣି",
    "overflow": "ଓଭରଫ୍ଲୋ",
    "garbage": "ଅବର୍ଜନା"
}

@app.route("/api/v1/transcribe-voice", methods=["POST"])
def transcribe_voice():
    data = request.get_json() or {}
    raw_text = data.get("text", "").strip()
    target_lang = str(data.get("lang", "or-IN")).lower()
    
    if not raw_text:
        return jsonify({"status": "success", "native_text": ""})
        
    api_key = os.environ.get("MISTRAL_API_KEY")
    if api_key:
        try:
            client = Mistral(api_key=api_key)
            prompt = f"""
            Act as an expert Odia & Regional Language Speech Normalizer for Municipal Civic Reports.
            The user selected target language: "{target_lang}".
            Captured raw speech transcript: "{raw_text}".

            CRITICAL DIRECTIVE:
            1. If target language is Odia ('or-in', 'ori-in', 'or'), YOU MUST ALWAYS CONVERT AND WRITE THE FINAL TRANSCRIPT STRICTLY IN AUTHENTIC ODIA SCRIPT (ଓଡ଼ିଆ).
            2. Convert any English words or phonetic Odia transliterations (e.g. "kuda pakha", "victoria hotel", "aborjana", "nalla", "eithi", "bohut") into authentic Odia Script (ଓଡ଼ିଆ).
            3. If target language is Hindi, write in Devanagari script (हिन्दी).
            4. If target language is Bengali, write in Bengali script (বাংলা).

            You MUST return ONLY a valid JSON object:
            {{"native_text": "Clean transcript strictly in native script (e.g. ଓଡ଼ିଆ)..."}}
            """
            resp = client.chat.complete(
                model="mistral-small-latest",
                response_format={"type": "json_object"},
                max_tokens=250,
                messages=[{"role": "user", "content": prompt}]
            )
            content = resp.choices[0].message.content.strip()
            res_data = json.loads(content)
            native_text = res_data.get("native_text", raw_text)
            return jsonify({"status": "success", "native_text": native_text})
        except Exception as e:
            print("Voice transcription Error:", e)
            
    return jsonify({"status": "success", "native_text": raw_text})


@app.route("/api/v1/transcribe-voice-audio", methods=["POST"])
def transcribe_voice_audio():
    audio_file = request.files.get("audio")
    target_lang = str(request.form.get("lang", "or-IN")).lower()
    
    if not audio_file:
        return jsonify({"status": "error", "message": "No audio file uploaded"}), 400
        
    audio_bytes = audio_file.read()
    if not audio_bytes:
        return jsonify({"status": "error", "message": "Empty audio file"}), 400

    api_key = os.environ.get("MISTRAL_API_KEY")
    if api_key:
        try:
            client = Mistral(api_key=api_key)
            prompt = f"""
            Act as an expert Odia & Regional Language Audio Speech Transcriber for Municipal Civic Reports.
            Target Language: {target_lang} (Odia / Hindi / Bengali / English).
            
            CRITICAL DIRECTIVE:
            1. Transcribe the spoken audio. If target language is Odia ('or-in', 'ori-in', 'or'), YOU MUST ALWAYS WRITE THE FINAL TRANSCRIPT STRICTLY IN AUTHENTIC ODIA SCRIPT (ଓଡ଼ିଆ).
            2. If target language is Hindi, write in Devanagari script (हिन्दी).
            3. If target language is Bengali, write in Bengali script (বাংলা).

            You MUST return ONLY a valid JSON object:
            {{"native_text": "Clean native script transcript..."}}
            """
            
            resp = client.chat.complete(
                model="mistral-small-latest",
                response_format={"type": "json_object"},
                max_tokens=250,
                messages=[{"role": "user", "content": prompt}]
            )
            content = resp.choices[0].message.content.strip()
            res_data = json.loads(content)
            native_text = res_data.get("native_text", raw_text if 'raw_text' in locals() else "")
            return jsonify({"status": "success", "native_text": native_text})
        except Exception as e:
            print("Audio transcribe error:", e)
            
    return jsonify({"status": "success", "native_text": ""})


@app.route("/api/v1/auth", methods=["POST"])
def officer_login():
    data = request.get_json() or {}
    officer_id = data.get("id", "").strip()
    password = data.get("password", "").strip()

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


@app.route("/api/v1/report", methods=["POST"])
def submit_report():
    api_key = os.environ.get("MISTRAL_API_KEY", "")
    conn = None
    try:
        data = request.form.to_dict()
        lat = float(data.get("lat", 20.2961))
        lng = float(data.get("lng", 85.8245))
        note = data.get("note", "").strip()
        lang = data.get("lang", "or-IN").strip()

        is_sensitive = data.get("is_sensitive_area", "0") in ["1", "true", "True"]
        sensitive_type = data.get("sensitive_area_type", "None").strip()

        file = request.files.get("image")
        if not file:
            return jsonify({"status": "error", "message": "No image provided"}), 400

        img_bytes = file.read()
        if not img_bytes:
            return jsonify({"status": "error", "message": "Empty image uploaded"}), 400

        user_id = data.get("user_id", "").strip() or request.remote_addr or "anon_user"

        anonymized_bytes, faces_blurred, plates_blurred = anonymize_image_bytes(img_bytes)

        jurisdiction_info = check_municipal_jurisdiction(lat, lng)
        in_jurisdiction = 1 if jurisdiction_info["in_jurisdiction"] else 0
        authority_name = jurisdiction_info["authority"]

        ai_data = analyze_image_with_mistral(
            anonymized_bytes, citizen_note=note, lang=lang, api_key=api_key
        )

        is_drain = bool(ai_data.get("is_drain_blocked", False))
        is_fire = bool(ai_data.get("is_fire_hazard", False))
        dispatch_unit = ai_data.get("dispatch_unit", "Manual Sanitation Crew")
        incoming_category = ai_data.get("category", "Organic Waste")

        duplicate_match = find_existing_nearby_ticket_fs(
            lat=lat, lng=lng, category=incoming_category, max_distance_meters=20.0
        )

        if duplicate_match:
            merged_res = merge_duplicate_ticket_fs(existing_ticket=duplicate_match, reporter_id=user_id)
            action_type = merged_res.get("action_status", "merged_duplicate")
            is_spam_prevented = merged_res.get("is_spam_prevented", False)

            if action_type == "already_reported":
                msg = "You have already submitted a report for this issue. Priority boost is restricted to unique citizen reports."
            else:
                msg = "Report matched an existing active ticket within 20m. Priority incremented (+1 unique citizen confirmation)."

            return jsonify(
                {
                    "status": "success",
                    "action": action_type,
                    "is_spam_prevented": is_spam_prevented,
                    "message": msg,
                    "ticket_id": duplicate_match["id"],
                    "category": duplicate_match.get("category"),
                    "in_jurisdiction": in_jurisdiction,
                    "governing_authority": authority_name,
                    "jurisdiction_note": jurisdiction_info["jurisdiction_note"]
                }
            )

        computed_urgency = calculate_algorithmic_urgency(
            category=incoming_category,
            volume_band=ai_data.get("volume_band", "Medium (0.2-1.0m³)"),
            is_drain_blocked=is_drain,
            is_fire_hazard=is_fire,
            is_sensitive_area=is_sensitive,
            duplicate_count=0,
            is_monsoon_season=True,
        )

        img_b64 = base64.b64encode(anonymized_bytes).decode("utf-8")

        ticket_id = f"SW-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.utcnow().isoformat()

        ticket_record = {
            "id": ticket_id,
            "lat": lat,
            "lng": lng,
            "category": incoming_category,
            "volume_band": ai_data.get("volume_band"),
            "hazard_level": 1 if (is_drain or is_fire) else 0,
            "is_drain_blocked": 1 if is_drain else 0,
            "is_fire_hazard": 1 if is_fire else 0,
            "description": ai_data.get("description"),
            "confidence": float(ai_data.get("confidence", 0.9)),
            "urgency_score": float(computed_urgency),
            "status": "reported",
            "faces_blurred": int(faces_blurred),
            "plates_blurred": int(plates_blurred),
            "image_b64": img_b64,
            "note": note,
            "note_summary_en": ai_data.get("note_summary_en", note),
            "lang": lang,
            "created_at": now_str,
            "last_seen": now_str,
            "duplicate_count": 0,
            "reporters": json.dumps([user_id]),
            "is_sensitive_area": 1 if is_sensitive else 0,
            "sensitive_area_type": sensitive_type,
            "dispatch_unit": dispatch_unit,
            "in_jurisdiction": int(in_jurisdiction),
            "governing_authority": authority_name
        }

        save_ticket(ticket_record)

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
                    "dispatch_unit": dispatch_unit,
                    "is_sensitive_area": 1 if is_sensitive else 0,
                    "sensitive_area_type": sensitive_type,
                    "note_summary_en": ai_data.get("note_summary_en", note),
                    "faces_blurred": faces_blurred,
                    "plates_blurred": plates_blurred,
                    "lat": lat,
                    "lng": lng,
                    "in_jurisdiction": bool(in_jurisdiction),
                    "governing_authority": authority_name,
                    "jurisdiction_note": jurisdiction_info["jurisdiction_note"]
                },
            }
        )

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/v1/config/municipality", methods=["GET", "POST"])
def manage_municipality_config():
    from scoring import MUNICIPAL_BOUNDS, CITY_PRESETS, set_active_municipality
    if request.method == "POST":
        data = request.get_json() or {}
        city_code = data.get("city_code")
        if city_code and city_code in CITY_PRESETS:
            new_bounds = set_active_municipality(city_code)
        else:
            new_bounds = set_active_municipality(data)
        return jsonify({"status": "success", "config": new_bounds, "presets": CITY_PRESETS})

    return jsonify({"status": "success", "config": MUNICIPAL_BOUNDS, "presets": CITY_PRESETS})


@app.route("/api/v1/reports", methods=["GET"])
def get_reports():
    rows = get_all_tickets()
    reports = [dict(r) for r in rows]
    return jsonify({"status": "success", "data": reports})


@app.route("/api/v1/report/<ticket_id>/image", methods=["GET"])
def get_ticket_image(ticket_id):
    ticket = get_ticket(ticket_id)

    if not ticket or not ticket.get("image_b64"):
        return jsonify({"status": "error", "message": "Image not found"}), 404

    return jsonify({"status": "success", "image_b64": ticket["image_b64"]})


@app.route("/api/v1/reports/summary", methods=["POST", "GET"])
def get_reports_summary():
    rows = get_all_tickets()

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
        f"MUNICIPAL EXECUTIVE SUMMARY: Total {total} active civic complaint(s) logged. "
        f"Top reported waste category is '{top_cat}' ({categories.get(top_cat, 0)} reports). "
        f"Critical priority queue contains {high_urgency} high-urgency issue(s) (score >= 7.0), including {drain_blocks} drain blockage(s) and {fire_hazards} fire hazard(s). "
        f"Estimated Municipal Cleanliness Index: {cleanliness_score}/100. Immediate dispatch recommended for high-urgency clusters."
    )

    return jsonify({"status": "success", "summary": summary_text, "cleanliness_score": cleanliness_score})


def query_mistral_advisor(user_query: str, telemetry_context: str) -> str:
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
            f"You are the SwachhLens Municipal Command Advisor. Provide a direct, intelligent, and helpful answer for the officer.\n"
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
        pass
    return None


@app.route("/api/v1/ai/analyze-city", methods=["POST", "GET"])
def analyze_city_telemetry():
    rows = get_all_tickets()

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

    live_reply = query_mistral_advisor(user_query, telemetry_ctx) if user_query else None

    if live_reply:
        bot_response = f"Live Advisor Response:\n{live_reply}"
    elif total == 0:
        bot_response = "City Cleanliness Status: Excellent. No active complaints logged in database. All wards operating clean with 100% cleanliness score."
    elif "workload" in user_query or "work" in user_query or "clearance" in user_query or "backlog" in user_query:
        bot_response = (
            f"WORKLOAD BRIEFING:\n"
            f"- Pending Initial Dispatch: {reported} ticket(s)\n"
            f"- Currently In-Progress: {in_progress} ticket(s)\n"
            f"- Resolved Completed: {resolved}/{total} tickets\n"
            f"Estimated Clearance Effort: ~{est_hours} truck-hours required for full crew dispatch clearance."
        )
    elif "density" in user_query or "hotspot" in user_query or "high" in user_query:
        bot_response = (
            f"SPATIAL DENSITY ANALYTICS:\n"
            f"- Primary Waste Category: '{top_cat}' ({cat_counts.get(top_cat, 0)} reports)\n"
            f"- Environmental Hazards: {drain_blocked} blocked drain(s) & {fire_hazards} fire hazard(s)\n"
            f"Recommendation: Route heavy compaction vehicles to high-density clusters first."
        )
    elif "low" in user_query or "reason" in user_query or "cause" in user_query or "less" in user_query:
        bot_response = (
            f"LOW-COMPLAINT ZONE DIAGNOSTICS:\n"
            f"Low complaint density in peripheral wards stems from 2 distinct factors:\n"
            f"1. Efficient Routine Sweeps: Scheduled daily morning garbage vehicle routes.\n"
            f"2. Digital Adoption Gap: Citizens in rural/suburban wards report via physical councilors rather than mobile app.\n"
            f"Action Item: Deploy mobile reporting kiosks to bridge digital reporting gaps."
        )
    elif user_query:
        bot_response = (
            f"Strategic Advice for '{user_query}':\n"
            f"Currently tracking {total} total civic report(s) ({high_urgency} critical >= 7.0).\n"
            f"Recommended priority order: (1) Unblock {drain_blocked} monsoon drain(s), (2) Service {reported} pending reports, (3) Verify {in_progress} active sites."
        )
    else:
        bot_response = (
            f"City Advisor Ready:\n"
            f"Tracking {total} total report(s) across the city ({high_urgency} critical priority, {reported} pending dispatch).\n"
            f"Ask any specific question or select a topic."
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


@app.route("/api/v1/report/<ticket_id>/status", methods=["PATCH", "POST"])
def update_ticket_status(ticket_id):
    new_status = "in_progress"
    verification_b64 = None

    if request.is_json and request.get_json():
        data = request.get_json()
        new_status = data.get("status", "in_progress")
        verification_b64 = data.get("verification_image_b64")
    elif request.form:
        new_status = request.form.get("status", "in_progress")

    if "verification_image" in request.files:
        v_file = request.files["verification_image"]
        v_bytes = v_file.read()
        if v_bytes:
            verification_b64 = base64.b64encode(v_bytes).decode("utf-8")

    update_ticket_status_fs(ticket_id, new_status, verification_b64)

    return jsonify({
        "status": "success",
        "ticket_id": ticket_id,
        "new_status": new_status,
        "has_verification": bool(verification_b64)
    })


@app.route("/api/v1/report/<ticket_id>/verification-image", methods=["GET"])
def get_ticket_verification_image(ticket_id):
    ticket = get_ticket(ticket_id)

    if not ticket or not ticket.get("verification_image_b64"):
        return jsonify({"status": "error", "message": "Verification image not found"}), 404

    return jsonify({
        "status": "success",
        "verification_image_b64": ticket["verification_image_b64"],
        "resolved_at": ticket.get("resolved_at")
    })


@app.route("/<path:path>", methods=["GET"])
def static_proxy(path):
    if os.path.exists(os.path.join(FRONTEND_DIR, path)):
        return send_from_directory(FRONTEND_DIR, path)
    return jsonify({"status": "error", "message": "API endpoint or static file not found"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)