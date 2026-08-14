# handles the mistral pixtral vision API call + fallback heuristics
import base64
import json
import os

try:
    from mistralai import Mistral
except ImportError:
    from mistralai.client import Mistral


def determine_dispatch_unit(category: str, volume_band: str, is_drain_blocked: bool, is_fire_hazard: bool) -> str:
    """Pick the right crew/vehicle combo based on what we're dealing with."""
    if is_fire_hazard or is_drain_blocked or category == "Hazardous":
        return "Hazmat & Emergency Response Unit"
    if category in ["Plastic Waste", "E-Waste"]:
        return "Recycling Partner Route (EcoRoute)"
    if ("Large" in volume_band or "Very Large" in volume_band) or category == "Construction Debris":
        return "Mini Truck + Heavy Compactor Crew"
    return "Manual Sanitation Crew"


def analyze_image_with_mistral(
    image_bytes: bytes,
    citizen_note: str = "",
    lang: str = "en",
    api_key: str = None,
) -> dict:
    key = api_key or os.environ.get("MISTRAL_API_KEY")
    
    # if mistral isn't available, we can still do basic classification from the text
    def get_fallback():
        note_lower = citizen_note.lower() if citizen_note else ""
        is_drain = any(w in note_lower for w in ["drain", "nalla", "water", "block", "overflow", "stagnant", "flood"])
        is_fire = any(w in note_lower for w in ["fire", "burn", "smoke", "flame", "chemical", "spark"])
        
        # try to guess the category from keywords in the note
        category = "Organic Waste"
        if any(w in note_lower for w in ["plastic", "bottle", "bag", "polythene"]):
            category = "Plastic Waste"
        elif any(w in note_lower for w in ["debris", "construction", "brick", "cement", "stone"]):
            category = "Construction Debris"
        elif any(w in note_lower for w in ["electronic", "wire", "battery", "tv", "computer"]):
            category = "E-Waste"
        elif is_drain or "bin" in note_lower:
            category = "Overflowing Bin"

        summary = citizen_note if citizen_note else "No specific voice note provided."
        vol_band = "Medium (0.2-1.0m³)"
        dispatch = determine_dispatch_unit(category, vol_band, is_drain, is_fire)
        desc = f"Dispatch {dispatch} for {category}. " + ("Drain blockage flagged. " if is_drain else "") + ("Fire hazard flagged. " if is_fire else "")

        return {
            "category": category,
            "volume_band": vol_band,
            "is_drain_blocked": is_drain,
            "is_fire_hazard": is_fire,
            "note_summary_en": summary,
            "description": desc.strip(),
            "dispatch_unit": dispatch,
            "confidence": 0.85,
        }

    if not key:
        return get_fallback()

    try:
        client = Mistral(api_key=key)
        b64_str = base64.b64encode(image_bytes).decode("utf-8")
        img_data_url = f"data:image/jpeg;base64,{b64_str}"

        # send the image to pixtral for analysis
        prompt = f"""
        Act as a Municipal Waste Logistics Decision Support AI. Analyze this civic report photo and regional voice transcript.
        
        Citizen Voice Transcript ({lang}): "{citizen_note if citizen_note else 'No voice note provided'}"

        You MUST return ONLY a valid JSON object matching this exact schema:
        {{
          "category": "Plastic Waste" | "Organic Waste" | "Construction Debris" | "Overflowing Bin" | "E-Waste" | "Hazardous",
          "volume_band": "Small (<0.2m³)" | "Medium (0.2-1.0m³)" | "Large (1.0-3.0m³)" | "Very Large (>3.0m³)",
          "is_drain_blocked": true | false,
          "is_fire_hazard": true | false,
          "note_summary_en": "English translation and 1-sentence summary of the citizen voice note",
          "description": "Actionable 1-2 sentence vehicle dispatch recommendation incorporating visual and citizen context.",
          "confidence": 0.95
        }}
        """

        response = client.chat.complete(
            model="pixtral-12b-2409",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": img_data_url},
                    ],
                }
            ],
        )

        content = response.choices[0].message.content.strip()
        data = json.loads(content)
        cat = str(data.get("category", "Organic Waste"))
        vol = str(data.get("volume_band", "Medium (0.2-1.0m³)"))
        drain = bool(data.get("is_drain_blocked", False))
        fire = bool(data.get("is_fire_hazard", False))
        dispatch = determine_dispatch_unit(cat, vol, drain, fire)

        return {
            "category": cat,
            "volume_band": vol,
            "is_drain_blocked": drain,
            "is_fire_hazard": fire,
            "note_summary_en": str(data.get("note_summary_en", "No specific voice notes.")),
            "description": str(data.get("description", "Inspect site for general waste clearance.")),
            "dispatch_unit": dispatch,
            "confidence": float(data.get("confidence", 0.9)),
        }
    except Exception as err:
        print(f"[Vision Fallback] Mistral API call failed: {err}")
        return get_fallback()