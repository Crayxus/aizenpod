import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes import scriptures, users, ai, tts, sessions

app = FastAPI(title="ZenPod", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scriptures.router)
app.include_router(users.router)
app.include_router(ai.router)
app.include_router(tts.router)
app.include_router(sessions.router)


@app.on_event("startup")
async def startup():
    await init_db()
    await seed_data()


async def seed_data():
    from database import AsyncSessionLocal
    from models import Scripture, Chapter
    from sqlalchemy import select
    from data.seed import SCRIPTURES

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Scripture))
        if result.scalars().first():
            return  # already seeded, skip

        for item in SCRIPTURES:
            scripture = Scripture(
                title=item["title"],
                category=item["category"],
                description=item["description"],
                total_chapters=len(item["chapters"])
            )
            db.add(scripture)
            await db.flush()
            for ch in item["chapters"]:
                chapter = Chapter(
                    scripture_id=scripture.id,
                    chapter_no=ch["chapter_no"],
                    title=ch["title"],
                    content=ch["content"]
                )
                db.add(chapter)
        await db.commit()
        print("Scripture seed data loaded successfully")


@app.get("/")
async def root():
    return {"app": "ZenPod", "version": "1.0.0", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
