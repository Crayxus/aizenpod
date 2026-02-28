from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.ai_service import explain_scripture, ask_question
import traceback

router = APIRouter(prefix="/ai", tags=["ai"])


class ExplainRequest(BaseModel):
    text: str
    context: str = ""


class QuestionRequest(BaseModel):
    question: str
    scripture_text: str = ""


@router.post("/explain")
async def explain(body: ExplainRequest):
    try:
        result = await explain_scripture(body.text, body.context)
        return {"answer": result}
    except Exception as e:
        print("AI EXPLAIN ERROR:", traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/ask")
async def ask(body: QuestionRequest):
    try:
        result = await ask_question(body.question, body.scripture_text)
        return {"answer": result}
    except Exception as e:
        print("AI ASK ERROR:", traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})
