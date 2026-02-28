from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Scripture, Chapter, ReadingProgress
from pydantic import BaseModel

router = APIRouter(prefix="/scriptures", tags=["scriptures"])


@router.get("/")
async def list_scriptures(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scripture))
    scriptures = result.scalars().all()
    return [{"id": s.id, "title": s.title, "category": s.category, "description": s.description, "total_chapters": s.total_chapters} for s in scriptures]


@router.get("/{scripture_id}")
async def get_scripture(scripture_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scripture).where(Scripture.id == scripture_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "经文不存在")
    chapters_result = await db.execute(select(Chapter).where(Chapter.scripture_id == scripture_id).order_by(Chapter.chapter_no))
    chapters = chapters_result.scalars().all()
    return {
        "id": s.id, "title": s.title, "category": s.category, "description": s.description,
        "chapters": [{"id": c.id, "chapter_no": c.chapter_no, "title": c.title, "content": c.content} for c in chapters]
    }


@router.get("/{scripture_id}/chapters/{chapter_id}")
async def get_chapter(scripture_id: int, chapter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chapter).where(Chapter.id == chapter_id, Chapter.scripture_id == scripture_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "章节不存在")
    return {"id": c.id, "chapter_no": c.chapter_no, "title": c.title, "content": c.content, "scripture_id": c.scripture_id}
