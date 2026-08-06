# backend/utils/vision.py
import base64
import json
import os

try:
    from mistralai import Mistral
except ImportError:
    from mistralai.client import Mistral


def analyze_image_with_mistral(
    image_bytes: bytes,
    citizen_note: str = "",
    lang: str = "en",
    api_key: str = None,
) -> dict:
    key = api_key or os.environ.get("MISTRAL_API_KEY")
    if not key:
        raise ValueError("Mistral API key missing.")

    client = Mistral(api_key=key)
    b64_str = base64.b64encode(image_bytes).decode("utf-8")
    img_data_url = f"data:image/jpeg;base64,{b64_str}"

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

    try:
        data = json.loads(content)
        return {
            "category": str(data.get("category", "Organic Waste")),
            "volume_band": str(
                data.get("volume_band", "Medium (0.2-1.0m³)")
            ),
            "is_drain_blocked": bool(data.get("is_drain_blocked", False)),
            "is_fire_hazard": bool(data.get("is_fire_hazard", False)),
            "note_summary_en": str(
                data.get("note_summary_en", "No specific voice notes.")
            ),
            "description": str(
                data.get(
                    "description", "Inspect site for general waste clearance."
                )
            ),
            "confidence": float(data.get("confidence", 0.9)),
        }
    except Exception:
        return {
            "category": "Organic Waste",
            "volume_band": "Medium (0.2-1.0m³)",
            "is_drain_blocked": False,
            "is_fire_hazard": False,
            "note_summary_en": citizen_note,
            "description": "Manual municipal inspection required.",
            "confidence": 0.5,
        }