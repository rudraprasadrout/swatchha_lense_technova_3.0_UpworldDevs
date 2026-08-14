import math
from datetime import datetime
from scoring import calculate_algorithmic_urgency
from db import get_conn
import json

# earth's radius in meters - needed for the haversine calculation
EARTH_RADIUS_M = 6371000.0


def haversine_distance_meters(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    """Calculate the distance in meters between two GPS coordinates.
    Uses the haversine formula which accounts for earth's curvature."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )

    # clamp between 0 and 1 to avoid math domain errors with floating point
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_M * c


def find_existing_nearby_ticket(
    conn, lat: float, lng: float, category: str = None, max_distance_meters: float = 20.0
):
    """Check if there's already an active ticket within 20m of this location.
    If a category is given, only match tickets of the same category."""
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
            # if we're checking by category, skip tickets that are a different issue type
            if category:
                t_cat = (t_dict.get("category") or "").strip().lower()
                in_cat = category.strip().lower()
                if t_cat and in_cat and t_cat != in_cat:
                    continue
            return t_dict

    return None


def merge_duplicate_ticket(conn, existing_ticket: dict, reporter_id: str = "anonymous"):
    """Merge a new report into an existing ticket. Keeps track of who reported it
    so we can prevent the same person from spamming urgency boosts."""
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
        # they already reported this - just update last_seen, don't boost priority
        conn.execute(
            "UPDATE tickets SET last_seen = ? WHERE id = ?",
            (now_str, existing_ticket["id"]),
        )
        conn.commit()
        return {"action_status": "already_reported", "is_spam_prevented": True}

    # new reporter! add them and recalculate the urgency score
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