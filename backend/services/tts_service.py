import io
import base64
import edge_tts

VOICES = {
    "male":   "zh-CN-YunjianNeural",
    "female": "zh-CN-XiaoxiaoNeural",
    "monk":   "zh-CN-YunyeNeural",
}


async def text_to_speech(text: str, voice_key: str = "monk", rate: str = "-10%") -> str:
    voice = VOICES.get(voice_key, VOICES["monk"])
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    audio_bytes = buf.getvalue()
    if not audio_bytes:
        raise RuntimeError("edge-tts returned empty audio")
    return base64.b64encode(audio_bytes).decode()
