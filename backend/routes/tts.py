from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.tts_service import text_to_speech
import traceback

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice: str = "monk"
    rate: str = "-10%"


@router.post("/")
async def tts(body: TTSRequest):
    try:
        audio_b64 = await text_to_speech(body.text, body.voice, body.rate)
        return {"audio_base64": audio_b64, "format": "mp3"}
    except Exception as e:
        print("TTS ERROR:", traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
