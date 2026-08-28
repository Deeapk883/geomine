def strip_gemini_json_fences(text: str) -> str:
    """
    Strips markdown code fences (e.g. ```json ... ```) from Gemini AI response text.
    """
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()
