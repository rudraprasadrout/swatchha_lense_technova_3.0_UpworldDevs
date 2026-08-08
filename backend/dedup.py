import math
from datetime import datetime
from scoring import calculate_algorithmic_urgency
from db import get_conn


# Earth radius in meters
EARTH_RADIUS_M = 6371000.0


def haversine_distance_meters(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    """Calculates the great-circle distance between two GPS coordinates in meters safely."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )

    # Clamp 'a' between 0.0 and 1.0 to prevent floating point instability / domain errors
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_M * c


import json

def find_existing_nearby_ticket(
    conn, lat: float, lng: float, category: str = None, max_distance_meters: float = 20.0
):
    """Searches active tickets within `max_distance_meters` matching issue category if provided."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * 
        FROM tickets 
        WHERE status IN ('reported', 'in_progress')
    """)
    active_tickets = cursor.fetchall()

    for ticket in active_tickets:
        t_dict = dict(ticket)
        dist = haversine_distance_meters(
            lat, lng, t_dict["lat"], t_dict["lng"]
        )
        if dist <= max_distance_meters:
            if category:
                t_cat = (t_dict.get("category") or "").strip().lower()
                in_cat = category.strip().lower()
                if t_cat and in_cat and t_cat != in_cat:
                    continue
            return t_dict

    return None


def merge_duplicate_ticket(conn, existing_ticket: dict, reporter_id: str = "anonymous"):
    """Tracks unique reporters list and updates duplicate count & urgency score cleanly."""
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
        conn.execute(
            "UPDATE tickets SET last_seen = ? WHERE id = ?",
            (now_str, existing_ticket["id"]),
        )
        conn.commit()
        return {"action_status": "already_reported", "is_spam_prevented": True}

    reporters.append(reporter_id)
    unique_duplicate_count = max(0, len(reporters) - 1)

    new_urgency = calculate_algorithmic_urgency(
        category=existing_ticket.get("category", "Organic Waste"),
        volume_band=existing_ticket.get("volume_band", "Medium (0.2-1.0m³)"),
        is_drain_blocked=bool(existing_ticket.get("is_drain_blocked", 0)),
        is_fire_hazard=bool(existing_ticket.get("is_fire_hazard", 0)),
        is_sensitive_area=bool(existing_ticket.get("is_sensitive_area", 0)),
        duplicate_count=unique_duplicate_count,
    )

    conn.execute(
        """
        UPDATE tickets
        SET duplicate_count = ?,
            reporters = ?,
            urgency_score = ?,
            last_seen = ?
        WHERE id = ?
    """,
        (unique_duplicate_count, json.dumps(reporters), new_urgency, now_str, existing_ticket["id"]),
    )
    conn.commit()
    return {"action_status": "merged_duplicate", "is_spam_prevented": False}