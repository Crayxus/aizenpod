from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)           # 用户身份token（扫码获得）
    nickname = Column(String, default="修行者")
    wechat_openid = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_visit = Column(DateTime, default=datetime.utcnow)
    total_minutes = Column(Integer, default=0)                # 累计学习分钟数

    progress = relationship("ReadingProgress", back_populates="user")
    sessions = relationship("Session", back_populates="user")


class Scripture(Base):
    __tablename__ = "scriptures"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    category = Column(String)                                 # 部类：般若、密宗、律部…
    description = Column(Text, nullable=True)
    total_chapters = Column(Integer, default=1)

    chapters = relationship("Chapter", back_populates="scripture")
    progress = relationship("ReadingProgress", back_populates="scripture")


class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(Integer, primary_key=True, index=True)
    scripture_id = Column(Integer, ForeignKey("scriptures.id"))
    chapter_no = Column(Integer, default=1)
    title = Column(String)
    content = Column(Text)

    scripture = relationship("Scripture", back_populates="chapters")


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scripture_id = Column(Integer, ForeignKey("scriptures.id"))
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    scroll_position = Column(Float, default=0.0)              # 0.0 ~ 1.0 百分比
    last_read_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="progress")
    scripture = relationship("Scripture", back_populates="progress")


class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_hours = Column(Float, default=1.0)              # 购买时长
    payment_id = Column(String, nullable=True)               # 微信支付单号
    is_paid = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)

    user = relationship("User", back_populates="sessions")
