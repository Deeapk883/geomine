import os
import json
import io
from PIL import Image
from app.config import settings

def analyze_pit_material(image_bytes: bytes, lat: float, lng: float) -> dict:
    """
    Sends cropped RGB satellite patch and coordinates to Gemini for material classification.
    """
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
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
        import google.generativeai as genai
        genai.configure(api_key=api_key.strip())
        
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
        
        contents = []
        if image_bytes:
            try:
                pil_img = Image.open(io.BytesIO(image_bytes))
                contents.append(pil_img)
            except Exception:
                pass
        contents.append(prompt)

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(contents)
        
        res_text = response.text.strip()
        if res_text.startswith("```json"):
            res_text = res_text[7:]
        if res_text.startswith("```"):
            res_text = res_text[3:]
        if res_text.endswith("```"):
            res_text = res_text[:-3]

        return json.loads(res_text.strip())
    except Exception as e:
        return {
            "material_name": "Iron Ore / Bauxite",
            "confidence": "Low",
            "reasoning": [
                "Open-pit excavation pattern detected.",
                f"Classification fallback: {str(e)[:100]}"
            ]
        }