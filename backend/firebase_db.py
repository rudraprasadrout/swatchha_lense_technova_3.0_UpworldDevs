import json
import logging
import math
import os
from datetime import datetime
import requests

from db import DB_PATH, get_conn, init_db
from scoring import calculate_algorithmic_urgency

# firebase project config - using the REST API directly instead of the admin SDK
# because the admin SDK needs a service account key file and this keeps things simpler
FIREBASE_PROJECT_ID = "swachhlens-97fa5"
FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"
COLLECTION_NAME = "tickets"

# make sure local sqlite is set up too (we write to both as a safety net)
init_db(DB_PATH)

def dict_to_firestore_fields(d: dict) -> dict:
    """Turn a normal python dict into firestore's weird nested field format."""
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
    """Reverse of above - firestore format back to normal dict."""
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
    """Pull out the ticket data from a firestore document response."""
    if not doc or "fields" not in doc:
        return {}
    ticket = firestore_fields_to_dict(doc["fields"])
    # firestore stores the doc id in the 'name' path, extract it
    if "name" in doc and "id" not in ticket:
        ticket["id"] = doc["name"].split("/")[-1]
    return ticket


def save_ticket(ticket_dict: dict) -> bool:
    """Save ticket to both firebase and local sqlite. We keep both in sync
    so if one goes down we still have the data."""
    ticket_id = ticket_dict.get("id")
    if not ticket_id:
        return False

    clean_dict = ticket_dict.copy()
    # these are internal tracking fields, don't need them in the DB
    clean_dict.pop("action_status", None)
    clean_dict.pop("is_spam_prevented", None)

    # try firebase first
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}?documentId={ticket_id}"
        payload = {"fields": dict_to_firestore_fields(clean_dict)}
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code not in (200, 201):
            # doc might already exist, try updating instead
            patch_url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
            requests.patch(patch_url, json=payload, timeout=5)
    except Exception as e:
        logging.warning(f"Firebase save failed for {ticket_id}: {e}")

    # also save to sqlite as backup
    try:
        conn = get_conn(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(tickets)")
        valid_cols = set(row[1] for row in cursor.fetchall())

        sqlite_cols = [k for k in clean_dict.keys() if k in valid_cols]
        sqlite_vals = [clean_dict[k] for k in sqlite_cols]
        placeholders = ", ".join(["?"] * len(sqlite_cols))
        col_names = ", ".join(sqlite_cols)

        conn.execute(f"INSERT OR REPLACE INTO tickets ({col_names}) VALUES ({placeholders})", sqlite_vals)
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"SQLite save failed for {ticket_id}: {e}")

    return True


def get_all_tickets() -> list:
    """Get all tickets. Tries sqlite first since it's faster (no network hop),
    falls back to firebase if sqlite is empty or broken."""
    try:
        conn = get_conn(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tickets ORDER BY urgency_score DESC")
        rows = cursor.fetchall()
        conn.close()
        if rows:
            return [dict(row) for row in rows]
    except Exception as e:
        logging.error(f"SQLite get_all_tickets failed: {e}")

    # sqlite didn't work out, try firebase
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}"
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            data = res.json()
            docs = data.get("documents", [])
            tickets = [doc_to_ticket_dict(doc) for doc in docs if doc]
            if tickets:
                tickets.sort(key=lambda x: x.get("urgency_score", 0.0), reverse=True)
                # strip image data when listing all - saves bandwidth
                for t in tickets:
                    t.pop("image_b64", None)
                return tickets
    except Exception as e:
        logging.warning(f"Firebase get_all_tickets failed: {e}")

    return []


def get_ticket(ticket_id: str) -> dict:
    """Get a single ticket by ID. Tries firebase first (most up-to-date),
    then falls back to sqlite."""
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            doc = res.json()
            return doc_to_ticket_dict(doc)
    except Exception as e:
        logging.warning(f"Firebase get_ticket failed for {ticket_id}: {e}")

    # firebase didn't work, check local
    try:
        conn = get_conn(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logging.error(f"SQLite fallback failed for {ticket_id}: {e}")
        return None


def update_ticket_status(ticket_id: str, new_status: str, verification_b64: str = None) -> bool:
    """Update a ticket's status (and optionally attach a verification photo).
    Writes to both firebase and sqlite to keep them in sync."""
    now_str = datetime.utcnow().isoformat()
    fields_to_update = {
        "status": new_status,
        "resolved_at": now_str if new_status == "resolved" else None
    }
    if verification_b64:
        fields_to_update["verification_image_b64"] = verification_b64

    # update firebase - need to fetch current doc first to merge fields properly
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
        res_get = requests.get(url, timeout=5)
        if res_get.status_code == 200:
            existing = doc_to_ticket_dict(res_get.json())
            existing.update(fields_to_update)
            payload = {"fields": dict_to_firestore_fields(existing)}
            requests.patch(url, json=payload, timeout=5)
    except Exception as e:
        logging.warning(f"Firebase status update failed for {ticket_id}: {e}")

    # update sqlite too
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
    """Look through active tickets to see if there's already one within 20m
    of the same category. Uses haversine to calculate the actual distance."""
    tickets = get_all_tickets()
    active_tickets = [t for t in tickets if t.get("status") in ("reported", "in_progress")]

    for t in active_tickets:
        t_lat = t.get("lat")
        t_lng = t.get("lng")
        if t_lat is not None and t_lng is not None:
            # haversine formula for distance on a sphere
            phi1, phi2 = math.radians(lat), math.radians(t_lat)
            delta_phi = math.radians(t_lat - lat)
            delta_lambda = math.radians(t_lng - lng)
            a = (math.sin(delta_phi / 2.0) ** 2) + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
            a = min(1.0, max(0.0, a))  # clamp to avoid floating point weirdness
            c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
            dist = 6371000.0 * c
            if dist <= max_distance_meters:
                # make sure it's actually the same type of problem
                # (e.g. a blocked drain and overflowing bin at the same spot should be separate tickets)
                if category:
                    t_cat = (t.get("category") or "").strip().lower()
                    in_cat = category.strip().lower()
                    if t_cat and in_cat and t_cat != in_cat:
                        continue
                return t
    return None


def merge_duplicate_ticket_fs(existing_ticket: dict, reporter_id: str = "anonymous") -> dict:
    """When someone reports an issue that already has a ticket, we merge it.
    If the same person reports twice, we just update last_seen but don't boost priority
    (anti-spam). If it's a new person, we bump the duplicate count and recalculate urgency."""
    now_str = datetime.utcnow().isoformat()

    # parse out the reporters list - might be a json string or already a list
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
        # same person trying to report again - just note that they checked in
        existing_ticket["last_seen"] = now_str
        save_ticket(existing_ticket)
        res_ticket = existing_ticket.copy()
        res_ticket["action_status"] = "already_reported"
        res_ticket["is_spam_prevented"] = True
        return res_ticket

    # new person reporting the same issue - this is valuable community confirmation
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
    """Remove a ticket from both firebase and sqlite. Mainly used for test cleanup."""
    try:
        url = f"{FIRESTORE_BASE_URL}/{COLLECTION_NAME}/{ticket_id}"
        requests.delete(url, timeout=5)
    except Exception as e:
        logging.warning(f"Firebase delete failed for {ticket_id}: {e}")

    try:
        conn = get_conn(DB_PATH)
        conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"SQLite delete failed for {ticket_id}: {e}")

    return True
