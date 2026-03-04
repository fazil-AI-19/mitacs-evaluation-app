from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database import get_db
from app.models.evaluation_config import EvaluationConfig
from app.models.user import User, UserRole
from app.schemas.evaluation_config import (
    DEFAULT_CONFIG,
    EvaluationConfigRead,
    EvaluationConfigUpdate,
)

router = APIRouter(prefix="/evaluation-config", tags=["evaluation-config"])

_SINGLETON_ID = 1


def get_or_create_config(db: Session) -> EvaluationConfig:
    """Load the singleton config row, seeding defaults if it doesn't exist yet."""
    row = db.query(EvaluationConfig).filter(EvaluationConfig.id == _SINGLETON_ID).first()
    if row is None:
        row = EvaluationConfig(
            id=_SINGLETON_ID,
            config_data=DEFAULT_CONFIG,
            updated_at=datetime.utcnow(),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("", response_model=EvaluationConfigRead)
def get_config(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_role(UserRole.reviewer)),
):
    return get_or_create_config(db)


@router.put("", response_model=EvaluationConfigRead)
def update_config(
    payload: EvaluationConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.reviewer)),
):
    row = get_or_create_config(db)
    row.config_data = payload.config_data
    row.updated_at = datetime.utcnow()
    row.updated_by = current_user.id
    db.commit()
    db.refresh(row)
    return row
