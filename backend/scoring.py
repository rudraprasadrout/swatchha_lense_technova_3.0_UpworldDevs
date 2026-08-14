# scoring + jurisdiction logic for swachhlens

# how risky each waste type is (higher = more urgent)
CATEGORY_WEIGHTS = {
    "Hazardous": 3.0,
    "E-Waste": 2.5,
    "Overflowing Bin": 2.0,
    "Construction Debris": 2.0,
    "Organic Waste": 1.5,
    "Plastic Waste": 1.0,
}

# bigger piles = more trucks needed = higher score
VOLUME_WEIGHTS = {
    "Very Large (>3.0m³)": 3.0,
    "Large (1.0-3.0m³)": 2.0,
    "Medium (0.2-1.0m³)": 1.0,
    "Small (<0.2m³)": 0.5,
}

# bhubaneswar municipal corporation boundary box
# these are the lat/lng limits of BMC jurisdiction
BMC_BOUNDS = {
    "municipality_name": "Bhubaneswar Municipal Corporation (BMC)",
    "center_lat": 20.2961,
    "center_lng": 85.8245,
    "min_lat": 20.1500,
    "max_lat": 20.4500,
    "min_lng": 85.6500,
    "max_lng": 85.9500,
}

MUNICIPAL_BOUNDS = BMC_BOUNDS.copy()


def detect_external_region_name(lat: float, lng: float) -> str:
    """Figure out which district/region a point belongs to when it's outside BMC.
    This is a rough approximation based on the geography around Bhubaneswar."""

    # north of BMC -> probably Cuttack side
    if lat > 20.4500:
        if 85.7500 <= lng <= 85.9800:
            return "Cuttack Municipal Corporation (CMC) Boundary"
        return "Cuttack District Rural & Panchayati Raj Zone"
    
    # south of BMC -> Puri / Jatni direction
    elif lat < 20.1500:
        if 19.7500 <= lat <= 19.9000 and 85.7500 <= lng <= 85.9000:
            return "Puri Municipality Jurisdiction"
        return "Puri / Jatni District Administration Corridor"
    
    # east -> towards Jagatsinghpur
    elif lng > 85.9500:
        return "Khurda - Jagatsinghpur State Highway 16 Development Zone"
    
    # west -> Chandaka forest area
    elif lng < 85.6500:
        if lat > 22.0:
            return "Rourkela Municipal Corporation (RMC) Zone"
        return "Chandaka Forest Reserve / Khurda Rural Panchayati Raj Zone"
    
    return "Khurda District Rural Panchayati Raj & Highway Authority"


def check_municipal_jurisdiction(lat: float, lng: float) -> dict:
    """Check if a GPS coordinate falls within BMC limits. If not, figure out
    which external authority handles that area."""
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
    is_monsoon_season: bool = True,
) -> float:
    """Calculate a 1-10 urgency score based on what kind of waste it is, how much
    there is, whether it's blocking drains or near a school, etc.
    
    Formula is basically: start at 2, then add points for each risk factor."""
    
    # every verified report starts at 2.0
    score = 2.0

    # add weight based on waste type (hazardous stuff scores higher)
    score += CATEGORY_WEIGHTS.get(category, 1.0)

    # bigger pile = more points
    score += VOLUME_WEIGHTS.get(volume_band, 1.0)

    # blocked drains are extra bad during monsoon season
    if is_drain_blocked:
        score += 3.0 if is_monsoon_season else 2.0
    if is_fire_hazard:
        score += 2.5

    # near a school, hospital, or water body? bump it up
    if is_sensitive_area:
        score += 1.5

    # more people reporting the same issue = probably more serious
    # cap at +2.0 so one viral report doesn't break the scale
    score += min(2.0, duplicate_count * 0.5)

    final_score = round(min(10.0, max(1.0, score)), 1)
    return final_score