import secrets
import qrcode
import io
import base64
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User


async def get_or_create_user(token: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.token == token))
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.last_visit = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def create_user(db: AsyncSession, nickname: str = "修行者") -> User:
    token = secrets.token_urlsafe(16)
    user = User(token=token, nickname=nickname)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def generate_user_qr(token: str, base_url: str = "http://localhost:5173") -> str:
    """生成用户身份二维码，返回 base64 PNG"""
    url = f"{base_url}/login?token={token}"
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a1a2e", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
