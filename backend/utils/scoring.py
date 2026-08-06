# scoring.py

# Category Base Risk Weights
CATEGORY_WEIGHTS = {
    "Hazardous": 3.0,
    "E-Waste": 2.5,
    "Overflowing Bin": 2.0,
    "Construction Debris": 2.0,
    "Organic Waste": 1.5,
    "Plastic Waste": 1.0,
}

# Volume Band Weights
VOLUME_WEIGHTS = {
    "Very Large (>3.0m³)": 3.0,
    "Large (1.0-3.0m³)": 2.0,
    "Medium (0.2-1.0m³)": 1.0,
    "Small (<0.2m³)": 0.5,
}


def calculate_algorithmic_urgency(
    category: str,
    volume_band: str,
    is_drain_blocked: bool,
    is_fire_hazard: bool,
    duplicate_count: int = 0,
) -> float:
    """Calculates a deterministic 1.0 - 10.0 urgency score based on municipal parameters."""
    score = 0.0

    # 1. Base Category Risk
    score += CATEGORY_WEIGHTS.get(category, 1.0)

    # 2. Volume Weight
    score += VOLUME_WEIGHTS.get(volume_band, 1.0)

    # 3. Hazard Multipliers
    if is_drain_blocked:
        score += 2.5  # Critical during monsoon/rainy weather
    if is_fire_hazard:
        score += 2.5  # Immediate civic safety risk

    # 4. Duplicate/Community Interest Weight (+0.5 per extra report, max +2.0)
    score += min(2.0, duplicate_count * 0.5)

    # Cap at maximum 10.0 and round to 1 decimal place
    final_score = round(min(10.0, max(1.0, score)), 1)
    return final_score