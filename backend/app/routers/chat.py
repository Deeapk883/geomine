import base64
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.gemini_chat_analyzer import analyze_chat_mining_request

router = APIRouter()

class ChatAnalyzeRequest(BaseModel):
    image: Optional[str] = None  # Base64 string or data URL
    location: Optional[str] = "" # Area or coordinates, e.g., "Bellary, KA" or "15.14, 76.92"
    message: Optional[str] = ""  # User query or prompt

@router.post("/chat/analyze")
def chat_analyze_mining(payload: ChatAnalyzeRequest):
    try:
        image_bytes: Optional[bytes] = None
        
        if payload.image and payload.image.strip():
            raw_img = payload.image.strip()
            # If data URL like "data:image/png;base64,....", split prefix
            if "," in raw_img:
                raw_img = raw_img.split(",", 1)[1]
            image_bytes = base64.b64decode(raw_img)

        analysis = analyze_chat_mining_request(
            image_bytes=image_bytes,
            location=payload.location or "",
            message=payload.message or ""
        )

        return {
            "status": "success",
            "location": payload.location,
            "analysis": analysis
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Chat analysis failed: {str(e)}")
