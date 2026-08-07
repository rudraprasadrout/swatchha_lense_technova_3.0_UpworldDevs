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


def find_existing_nearby_ticket(
    conn, lat: float, lng: float, max_distance_meters: float = 20.0
):
    """Searches active tickets within `max_distance_meters` and returns full dictionary row if found."""
    cursor = conn.cursor()
    # SELECT * ensures all fields required for scoring recalculation are available
    cursor.execute("""
        SELECT * 
        FROM tickets 
        WHERE status IN ('reported', 'in_progress')
    """)
    active_tickets = cursor.fetchall()

    for ticket in active_tickets:
        # Convert sqlite3.Row to standard dict for safe key access
        t_dict = dict(ticket)
        dist = haversine_distance_meters(
            lat, lng, t_dict["lat"], t_dict["lng"]
        )
        if dist <= max_distance_meters:
            return t_dict

    return None


def merge_duplicate_ticket(conn, existing_ticket: dict):
    """Increments duplicate_count, updates last_seen timestamp, and recalculates score dynamically."""
    now_str = datetime.utcnow().isoformat()
    new_count = existing_ticket.get("duplicate_count", 0) + 1

    # Recalculate score dynamically using scoring engine
    new_urgency = calculate_algorithmic_urgency(
        category=existing_ticket.get("category", "Organic Waste"),
        volume_band=existing_ticket.get("volume_band", "Medium (0.2-1.0m³)"),
        is_drain_blocked=bool(existing_ticket.get("is_drain_blocked", 0)),
        is_fire_hazard=bool(existing_ticket.get("is_fire_hazard", 0)),
        is_sensitive_area=bool(existing_ticket.get("is_sensitive_area", 0)),
        duplicate_count=new_count,
    )


    conn.execute(
        """
        UPDATE tickets
        SET duplicate_count = ?,
            urgency_score = ?,
            last_seen = ?
        WHERE id = ?
    """,
        (new_count, new_urgency, now_str, existing_ticket["id"]),
    )
    conn.commit()