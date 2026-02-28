from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, ReadingProgress, Scripture
from services.user_service import get_or_create_user, create_user, generate_user_qr
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/")
async def new_user(db: AsyncSession = Depends(get_db)):
    user = await create_user(db)
    qr = generate_user_qr(user.token)
    return {"id": user.id, "token": user.token, "nickname": user.nickname, "qr_base64": qr}


@router.get("/token/{token}")
async def get_user(token: str, db: AsyncSession = Depends(get_db)):
    user = await get_or_create_user(token, db)
    if not user:
        raise HTTPException(404, "用户不存在")
    return {"id": user.id, "token": user.token, "nickname": user.nickname,
            "created_at": user.created_at, "last_visit": user.last_visit,
            "total_minutes": user.total_minutes}


@router.get("/token/{token}/progress")
async def get_progress(token: str, db: AsyncSession = Depends(get_db)):
    user = await get_or_create_user(token, db)
    if not user:
        raise HTTPException(404, "用户不存在")
    result = await db.execute(
        select(ReadingProgress, Scripture)
        .join(Scripture, ReadingProgress.scripture_id == Scripture.id)
        .where(ReadingProgress.user_id == user.id)
        .order_by(ReadingProgress.last_read_at.desc())
    )
    rows = result.all()
    return [{"scripture_id": p.scripture_id, "scripture_title": s.title,
             "chapter_id": p.chapter_id, "scroll_position": p.scroll_position,
             "last_read_at": p.last_read_at} for p, s in rows]


class ProgressUpdate(BaseModel):
    scripture_id: int
    chapter_id: int | None = None
    scroll_position: float = 0.0


@router.post("/token/{token}/progress")
async def save_progress(token: str, body: ProgressUpdate, db: AsyncSession = Depends(get_db)):
    user = await get_or_create_user(token, db)
    if not user:
        raise HTTPException(404, "用户不存在")
    result = await db.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user.id,
            ReadingProgress.scripture_id == body.scripture_id
        )
    )
    progress = result.scalar_one_or_none()
    if progress:
        progress.chapter_id = body.chapter_id
        progress.scroll_position = body.scroll_position
        progress.last_read_at = datetime.utcnow()
    else:
        progress = ReadingProgress(user_id=user.id, scripture_id=body.scripture_id,
                                   chapter_id=body.chapter_id, scroll_position=body.scroll_position)
        db.add(progress)
    await db.commit()
    return {"ok": True}
