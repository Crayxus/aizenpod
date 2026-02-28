from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Session, User
from services.payment_service import create_native_order, query_order
from services.user_service import get_or_create_user
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    duration_hours: float = 1.0
    user_token: str | None = None


@router.post("/")
async def create_session(body: CreateSessionRequest, db: AsyncSession = Depends(get_db)):
    out_trade_no = uuid.uuid4().hex
    amount_fen = int(body.duration_hours * 2800)  # 1h=28元, 2h=56元
    desc = f"ZenPod 禅境 {body.duration_hours}小时体验"

    payment = await create_native_order(out_trade_no, amount_fen, desc)

    user_id = None
    if body.user_token:
        user = await get_or_create_user(body.user_token, db)
        if user:
            user_id = user.id

    session = Session(
        user_id=user_id,
        duration_hours=body.duration_hours,
        payment_id=out_trade_no,
        is_paid=payment.get("demo", False),
        is_active=payment.get("demo", False)
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session_id": session.id,
        "out_trade_no": out_trade_no,
        "code_url": payment["code_url"],
        "amount_yuan": amount_fen / 100,
        "demo": payment.get("demo", False),
        "is_active": session.is_active
    }


@router.get("/{session_id}/status")
async def session_status(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        return {"error": "not found"}

    if session.is_active and session.start_time:
        elapsed = (datetime.utcnow() - session.start_time).total_seconds()
        remaining = session.duration_hours * 3600 - elapsed
        if remaining <= 0:
            session.is_active = False
            session.end_time = datetime.utcnow()
            await db.commit()
            remaining = 0
        return {"is_active": session.is_active, "remaining_seconds": max(0, remaining)}

    # 查询支付状态
    pay_result = await query_order(session.payment_id)
    if pay_result["trade_state"] == "SUCCESS" and not session.is_paid:
        session.is_paid = True
        session.is_active = True
        session.start_time = datetime.utcnow()
        await db.commit()

    return {"is_active": session.is_active, "is_paid": session.is_paid}


@router.post("/{session_id}/activate")
async def activate_demo(session_id: int, db: AsyncSession = Depends(get_db)):
    """Demo用：直接激活会话"""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session:
        session.is_paid = True
        session.is_active = True
        session.start_time = datetime.utcnow()
        await db.commit()
    return {"ok": True, "is_active": True}
