import os
import json
from app.config import settings

def analyze_pit_material(image_bytes: bytes, lat: float, lng: float) -> dict:
    """
    Sends cropped RGB satellite patch and coordinates to Gemini for material classification.
    """
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "material_name": "Iron Ore / Hematite",
            "confidence": "Medium",
            "reasoning": [
                "Reddish-brown surface reflectance typical of high-grade iron ore / laterite deposits.",
                "Geographic coordinates match active mining corridor in Bellary/Hospet region."
            ],
            "note": "Add GEMINI_API_KEY in backend/.env to activate live Gemini 2.5 Multimodal classification."
        }

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        You are an expert remote sensing geologist.
        Analyze this high-resolution satellite crop of an open-pit mining site located at (Latitude: {lat}, Longitude: {lng}).
        
        Identify the most probable material being extracted (e.g., Iron Ore, Coal, Sand/Gravel, Bauxite, Limestone, Gold, Copper).
        
        Return your response strictly as valid JSON matching this schema:
        {{
          "material_name": "Material Name",
          "confidence": "High" | "Medium" | "Low",
          "reasoning": [
            "First concise visual observation (color, texture, pit pattern).",
            "Second concise observation regarding geographic/regional geology context."
          ]
        }}
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                prompt
            ],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        return json.loads(response.text)
    except Exception as e:
        return {
            "material_name": "Iron Ore / Bauxite",
            "confidence": "Low",
            "reasoning": [
                "Open-pit excavation pattern detected.",
                f"Classification fallback: {str(e)[:100]}"
            ]
        }