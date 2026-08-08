import json
import logging
import math
import os
from datetime import datetime
import requests

from db import DB_PATH, get_conn, init_db
from scoring import calculate_algorithmic_urgency

FIREBASE_PROJECT_ID = "swachhlens-97fa5"
FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"
COLLECTION_NAME = "tickets"

# Initialize local SQLite DB schema for dual-redundancy
init_db(DB_PATH)

def dict_to_firestore_fields(d: dict) -> dict:
    """Converts a standard Python dictionary to Firestore REST API field format."""
    fields = {}
    for k, v in d.items():
        if v is None:
            fields[k] = {"nullValue": None}
        elif isinstance(v, bool):
            fields[k] = {"booleanValue": v}
        elif isinstance(v, int):
            fields[k] = {"integerValue": str(v)}
        elif isinstance(v, float):
            fields[k] = {"doubleValue": float(v)}
        elif isinstance(v, str):
            fields[k] = {"stringValue": v}
    return fields

def firestore_fields_to_dict(fields: dict) -> dict:
    """Converts Firestore REST API fields structure back into standard Python dict."""
    d = {}
    if not fields:
        return d
    for k, v in fields.items():
        if "stringValue" in v:
            d[k] = v["stringValue"]
        elif "integerValue" in v:
            d[k] = int(v["integerValue"])
        elif "doubleValue" in v:
            d[k] = float(v["doubleValue"])
        elif "booleanValue" in v:
            d[k] = bool(v["booleanValue"])
        elif "nullValue" in v:
            d[k] = None
    return d

def doc_to_ticket_dict(doc: dict) -> dict:
    """Extracts ticket ID and converts fields from a Firestore document object."""
    if not doc or "fields" not in doc:
        return {}
    ticket = firestore_fields_to_dict(doc["fields"])
    if "name" in doc and "id" not in ticket:
        ticket["id"] = doc["name"].split("/")[-1]
    return ticket


# Database helper functions

def save_ticket(ticket_dict: dict) -> bool:
    """Saves a ticket dictionary into Firebase Firestore AND SQLite local DB."""
    ticket_id = ticket_dict.get("id")
    if not ticket_id:
        return False

    clean_dict = ticket_dict.copy()
    clean_dict.pop("action_status", None)
    clean_dict.pop("is_spam_prevented", None)

    # 1. Save to Firebase Firestore
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}?documentId={ticket_id}"
        payload = {"fields": dict_to_firestore_fields(clean_dict)}
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code not in (200, 201):
            # If document already exists, update via PATCH
            patch_url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
            requests.patch(patch_url, json=payload, timeout=5)
    except Exception as e:
        logging.warning(f"Firebase Firestore save exception for ticket {ticket_id}: {e}")

    # 2. Save to SQLite for local redundancy
    try:
        conn = get_conn(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(tickets)")
        valid_cols = set(row[1] for row in cursor.fetchall())

        sqlite_cols = [k for k in clean_dict.keys() if k in valid_cols]
        sqlite_vals = [clean_dict[k] for k in sqlite_cols]
        placeholders = ", ".join(["?"] * len(sqlite_cols))
        col_names = ", ".join(sqlite_cols)

        # Replace existing ticket if already present
        conn.execute(f"INSERT OR REPLACE INTO tickets ({col_names}) VALUES ({placeholders})", sqlite_vals)
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"SQLite save exception for ticket {ticket_id}: {e}")

    return True


def get_all_tickets() -> list:
    """Fast local-first retrieval of all ticket records including image payload."""
    try:
        conn = get_conn(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tickets ORDER BY urgency_score DESC")
        rows = cursor.fetchall()
        conn.close()
        if rows:
            return [dict(row) for row in rows]
    except Exception as e:
        logging.error(f"SQLite fast get_all_tickets failed: {e}")

    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}"
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            data = res.json()
            docs = data.get("documents", [])
            tickets = [doc_to_ticket_dict(doc) for doc in docs if doc]
            if tickets:
                tickets.sort(key=lambda x: x.get("urgency_score", 0.0), reverse=True)
                for t in tickets:
                    t.pop("image_b64", None)
                return tickets
    except Exception as e:
        logging.warning(f"Firebase Firestore get_all_tickets failed: {e}")

    return []


def get_ticket(ticket_id: str) -> dict:
    """Retrieves single ticket by ID from Firebase Firestore (with SQLite fallback)."""
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            doc = res.json()
            return doc_to_ticket_dict(doc)
    except Exception as e:
        logging.warning(f"Firebase Firestore get_ticket failed for {ticket_id}: {e}")

    try:
        conn = get_conn(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logging.error(f"SQLite get_ticket fallback failed for {ticket_id}: {e}")
        return None


def update_ticket_status(ticket_id: str, new_status: str, verification_b64: str = None) -> bool:
    """Updates ticket status and verification photo in Firebase Firestore AND SQLite."""
    now_str = datetime.utcnow().isoformat()
    fields_to_update = {
        "status": new_status,
        "resolved_at": now_str if new_status == "resolved" else None
    }
    if verification_b64:
        fields_to_update["verification_image_b64"] = verification_b64

    # 1. Update Firebase Firestore
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
        # Fetch current doc to merge fields
        res_get = requests.get(url, timeout=5)
        if res_get.status_code == 200:
            existing = doc_to_ticket_dict(res_get.json())
            existing.update(fields_to_update)
            payload = {"fields": dict_to_firestore_fields(existing)}
            requests.patch(url, json=payload, timeout=5)
    except Exception as e:
        logging.warning(f"Firebase Firestore status update failed for {ticket_id}: {e}")

    # 2. Update SQLite local DB
    try:
        conn = get_conn(DB_PATH)
        if verification_b64:
            conn.execute(
                "UPDATE tickets SET status = ?, verification_image_b64 = ?, resolved_at = ? WHERE id = ?",
                (new_status, verification_b64, now_str, ticket_id)
            )
        else:
            conn.execute(
                "UPDATE tickets SET status = ?, resolved_at = ? WHERE id = ?",
                (new_status, now_str, ticket_id)
            )
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"SQLite status update failed for {ticket_id}: {e}")

    return True


def find_existing_nearby_ticket_fs(lat: float, lng: float, category: str = None, max_distance_meters: float = 20.0) -> dict:
    """Checks active tickets within `max_distance_meters` in Firebase Firestore / SQLite, matching issue category if specified."""
    tickets = get_all_tickets()
    active_tickets = [t for t in tickets if t.get("status") in ("reported", "in_progress")]

    for t in active_tickets:
        t_lat = t.get("lat")
        t_lng = t.get("lng")
        if t_lat is not None and t_lng is not None:
            phi1, phi2 = math.radians(lat), math.radians(t_lat)
            delta_phi = math.radians(t_lat - lat)
            delta_lambda = math.radians(t_lng - lng)
            a = (math.sin(delta_phi / 2.0) ** 2) + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
            a = min(1.0, max(0.0, a))
            c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
            dist = 6371000.0 * c
            if dist <= max_distance_meters:
                # Category-Aware Check: Ensure different issues (e.g. Blocked Drain vs Overflowing Trash) in nearby area create separate tickets
                if category:
                    t_cat = (t.get("category") or "").strip().lower()
                    in_cat = category.strip().lower()
                    if t_cat and in_cat and t_cat != in_cat:
                        continue  # Different issue type at nearby location
                return t
    return None


def merge_duplicate_ticket_fs(existing_ticket: dict, reporter_id: str = "anonymous") -> dict:
    """
    Merges duplicate report with existing ticket.
    Tracks unique reporters list.
    If same reporter_id attempts repeated submissions -> suppresses urgency boost (Anti-Spam Filter).
    If distinct reporter_id submits -> increments unique duplicate count (+1) and recalculates score.
    """
    now_str = datetime.utcnow().isoformat()

    reporters_raw = existing_ticket.get("reporters", "[]")
    if isinstance(reporters_raw, str):
        try:
            reporters = json.loads(reporters_raw)
        except Exception:
            reporters = []
    elif isinstance(reporters_raw, list):
        reporters = reporters_raw
    else:
        reporters = []

    already_reported = reporter_id in reporters

    if already_reported:
        # Same user spam attempt: Record last_seen but suppress duplicate_count increment and urgency escalation
        existing_ticket["last_seen"] = now_str
        save_ticket(existing_ticket)
        res_ticket = existing_ticket.copy()
        res_ticket["action_status"] = "already_reported"
        res_ticket["is_spam_prevented"] = True
        return res_ticket

    # New unique citizen report
    reporters.append(reporter_id)
    unique_duplicate_count = max(0, len(reporters) - 1)

    new_urgency = calculate_algorithmic_urgency(
        category=existing_ticket.get("category", "Organic Waste"),
        volume_band=existing_ticket.get("volume_band", "Medium (0.2-1.0m³)"),
        is_drain_blocked=bool(existing_ticket.get("is_drain_blocked", 0)),
        is_fire_hazard=bool(existing_ticket.get("is_fire_hazard", 0)),
        is_sensitive_area=bool(existing_ticket.get("is_sensitive_area", 0)),
        duplicate_count=unique_duplicate_count
    )

    existing_ticket["reporters"] = json.dumps(reporters)
    existing_ticket["duplicate_count"] = unique_duplicate_count
    existing_ticket["urgency_score"] = new_urgency
    existing_ticket["last_seen"] = now_str

    save_ticket(existing_ticket)
    res_ticket = existing_ticket.copy()
    res_ticket["action_status"] = "merged_duplicate"
    res_ticket["is_spam_prevented"] = False
    return res_ticket


def delete_ticket_fs(ticket_id: str) -> bool:
    """Deletes ticket from Firebase Firestore AND SQLite (used during test cleanups)."""
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
        requests.delete(url, timeout=5)
    except Exception as e:
        logging.warning(f"Firebase Firestore delete ticket failed for {ticket_id}: {e}")

    try:
        conn = get_conn(DB_PATH)
        conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"SQLite delete ticket failed for {ticket_id}: {e}")

    return True
