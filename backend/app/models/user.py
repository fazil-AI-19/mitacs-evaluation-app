import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String

from app.database import Base


class UserRole(str, enum.Enum):
    applicant = "applicant"
    reviewer = "reviewer"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.applicant)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
