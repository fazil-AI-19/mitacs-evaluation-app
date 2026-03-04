from typing import Optional

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole

# auto_error=False so requests without a token don't automatically get a 401
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Return a fixed demo user; create it on first call if it doesn't exist."""
    demo = db.query(User).filter(User.email == "demo@mitacs.ca").first()
    if not demo:
        demo = User(
            email="demo@mitacs.ca",
            full_name="Demo User",
            hashed_password="demo",
            role=UserRole.reviewer,
        )
        db.add(demo)
        db.commit()
        db.refresh(demo)
    return demo


def require_role(role: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        return current_user  # no role check in demo mode

    return role_checker

