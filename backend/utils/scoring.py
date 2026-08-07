# backend/utils/scoring.py

# Category Base Risk Weights
CATEGORY_WEIGHTS = {
    "Hazardous": 3.0,
    "E-Waste": 2.5,
    "Overflowing Bin": 2.0,
    "Construction Debris": 2.0,
    "Organic Waste": 1.5,
    "Plastic Waste": 1.0,
}

# Volume Weight Multipliers
VOLUME_WEIGHTS = {
    "Very Large (>3.0m³)": 3.0,
    "Large (1.0-3.0m³)": 2.0,
    "Medium (0.2-1.0m³)": 1.0,
    "Small (<0.2m³)": 0.5,
}

# Official Municipal Geofence - Bhubaneswar Municipal Corporation (BMC)
BMC_BOUNDS = {
    "municipality_name": "Bhubaneswar Municipal Corporation (BMC)",
    "center_lat": 20.2961,
    "center_lng": 85.8245,
    "min_lat": 20.1500,
    "max_lat": 20.4500,
    "min_lng": 85.6500,
    "max_lng": 85.9500,
}

# Alias for backward compatibility
MUNICIPAL_BOUNDS = BMC_BOUNDS.copy()


def detect_external_region_name(lat: float, lng: float) -> str:
    """
    Dynamically identifies the specific external district or region name
    for GPS coordinates outside Bhubaneswar (BMC) municipal limits.
    """
    # 1. North of BMC -> Cuttack Region / CMC Jurisdiction
    if lat > 20.4500:
        if 85.7500 <= lng <= 85.9800:
            return "Cuttack Municipal Corporation (CMC) Boundary"
        return "Cuttack District Rural & Panchayati Raj Zone"
    
    # 2. South / South-East of BMC -> Puri / Pipili / Jatni Corridor
    elif lat < 20.1500:
        if 19.7500 <= lat <= 19.9000 and 85.7500 <= lng <= 85.9000:
            return "Puri Municipality Jurisdiction"
        return "Puri / Jatni District Administration Corridor"
    
    # 3. East of BMC -> Khurda East / Jagatsinghpur Highway Corridor
    elif lng > 85.9500:
        return "Khurda - Jagatsinghpur State Highway 16 Development Zone"
    
    # 4. West / North-West of BMC -> Chandaka Reserve / Khurda Rural
    elif lng < 85.6500:
        if lat > 22.0:
            return "Rourkela Municipal Corporation (RMC) Zone"
        return "Chandaka Forest Reserve / Khurda Rural Panchayati Raj Zone"
    
    # Default Fallback for general Khurda Outer Territory
    return "Khurda District Rural Panchayati Raj & Highway Authority"


def check_municipal_jurisdiction(lat: float, lng: float) -> dict:
    """
    BMC Municipal Geofence Validation:
    Validates whether incoming citizen report coordinates fall within official BMC limits.
    If outside, dynamically identifies the specific external region and governing authority.
    """
    in_bmc = (
        BMC_BOUNDS["min_lat"] <= lat <= BMC_BOUNDS["max_lat"]
    ) and (
        BMC_BOUNDS["min_lng"] <= lng <= BMC_BOUNDS["max_lng"]
    )
    
    if in_bmc:
        return {
            "in_jurisdiction": True,
            "city_code": "BMC",
            "authority": "Bhubaneswar Municipal Corporation (BMC)",
            "routing_tag": "BMC Urban Sanitation Ward",
            "jurisdiction_note": "Within Official BMC Municipal Boundary"
        }
    else:
        region_name = detect_external_region_name(lat, lng)
        return {
            "in_jurisdiction": False,
            "city_code": "EXTERNAL",
            "external_region": region_name,
            "authority": f"District Panchayati Raj / Highway Development Authority ({region_name})",
            "routing_tag": f"External Jurisdiction ({region_name})",
            "jurisdiction_note": f"Out of BMC Region. This location falls under {region_name}. Please contact your local Panchayati Raj office or Highway Development Authority."
        }





def calculate_algorithmic_urgency(

    category: str,
    volume_band: str,
    is_drain_blocked: bool,
    is_fire_hazard: bool,
    is_sensitive_area: bool = False,
    duplicate_count: int = 0,
    is_monsoon_season: bool = True,  # Default True for Indian monsoon preparedness
) -> float:
    """
    Calculates a deterministic 1.0 - 10.0 urgency score based on municipal parameters.
    Formula: Base (2.0) + Category + Volume + Environmental Hazards + Location Sensitivity + Duplicate Multiplier
    """
    # Base starting score for any verified citizen report
    score = 2.0

    # 1. Category Risk Weight (Default 1.0 if category unrecognized)
    score += CATEGORY_WEIGHTS.get(category, 1.0)

    # 2. Volume Weight (Default 1.0 if volume string unrecognized)
    score += VOLUME_WEIGHTS.get(volume_band, 1.0)

    # 3. Hazard Multipliers
    if is_drain_blocked:
        # Elevate drain blockage priority to +3.0 during monsoon seasons
        score += 3.0 if is_monsoon_season else 2.0
    if is_fire_hazard:
        score += 2.5  # Immediate civic safety & air quality risk

    # 4. Location Sensitivity Multiplier (+1.5 for School/Hospital/Waterbody proximity)
    if is_sensitive_area:
        score += 1.5

    # 5. Duplicate/Community Interest Weight (+0.5 per extra report, max +2.0)
    score += min(2.0, duplicate_count * 0.5)

    # Cap at maximum 10.0 and minimum 1.0, rounded to 1 decimal place
    final_score = round(min(10.0, max(1.0, score)), 1)
    return final_score