# vision.py
import base64
import json
import os

try:
    from mistralai import Mistral
except ImportError:
    from mistralai.client import Mistral


def analyze_image_with_mistral(image_bytes: bytes, api_key: str = None) -> dict:
    key = api_key or os.environ.get("MISTRAL_API_KEY")
    if not key:
        raise ValueError("Mistral API key missing.")

    client = Mistral(api_key=key)
    b64_str = base64.b64encode(image_bytes).decode("utf-8")
    img_data_url = f"data:image/jpeg;base64,{b64_str}"

    prompt = """
    Act as a Municipal Waste Logistics Decision Support AI. Analyze this civic report photo.
    Return ONLY a valid JSON object matching this schema (no code block wrappers, no markdown):
    {
      "category": "Plastic Waste" | "Organic Waste" | "Construction Debris" | "Overflowing Bin" | "E-Waste" | "Hazardous",
      "volume_band": "Small (<0.2m³)" | "Medium (0.2-1.0m³)" | "Large (1.0-3.0m³)" | "Very Large (>3.0m³)",
      "is_drain_blocked": true | false,
      "is_fire_hazard": true | false,
      "description": "Short 1-2 sentence actionable dispatch recommendation.",
      "confidence": Float between 0.0 and 1.0
    }
    """

    response = client.chat.complete(
        model="pixtral-12b-2409",
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
    if content.startswith("```"):
        content = content.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "category": "Organic Waste",
            "volume_band": "Medium (0.2-1.0m³)",
            "is_drain_blocked": False,
            "is_fire_hazard": False,
            "description": "Manual municipal inspection required.",
            "confidence": 0.5,
        }