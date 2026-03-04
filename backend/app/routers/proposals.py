import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import settings
from app.core.dependencies import get_current_user, require_role
from app.database import SessionLocal, get_db
from app.models.proposal import Proposal, ProposalStatus
from app.models.user import User, UserRole
from app.schemas.proposal import DecisionSummary, ProposalRead, ProposalStatusRead, ProposalWithDecision

router = APIRouter(prefix="/proposals", tags=["proposals"])

# Absolute path to the bundled test proposal (in project root/test_proposals/)
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
_TEST_PROPOSAL_PATH = os.path.join(
    _PROJECT_ROOT, "test_proposals", "ai_pest_control_proposal.docx"
)


async def _save_upload(file: UploadFile) -> str:
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext != ".docx":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .docx files are accepted",
        )
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path


@router.post("/", response_model=ProposalRead, status_code=status.HTTP_201_CREATED)
async def submit_proposal(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    applicant_name: str = Form(...),
    institution: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.applicant)),
):
    file_path = await _save_upload(file)
    proposal = Proposal(
        applicant_id=current_user.id,
        title=title,
        applicant_name=applicant_name,
        institution=institution,
        file_path=file_path,
        original_filename=file.filename or "proposal.docx",
        status=ProposalStatus.pending,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    # Import here to avoid circular imports
    from app.services.proposal_service import run_crew_pipeline

    background_tasks.add_task(run_crew_pipeline, proposal.id, file_path)
    return proposal


@router.get("/my", response_model=List[ProposalRead])
def my_proposals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.applicant)),
):
    return (
        db.query(Proposal)
        .filter(Proposal.applicant_id == current_user.id)
        .order_by(Proposal.submitted_at.desc())
        .all()
    )


@router.get("/", response_model=List[ProposalWithDecision])
def list_proposals(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.reviewer)),
):
    from app.models.decision import Decision as DecisionModel

    query = db.query(Proposal)
    if status_filter:
        query = query.filter(Proposal.status == status_filter)
    proposals = query.order_by(Proposal.submitted_at.desc()).all()

    proposal_ids = [p.id for p in proposals]
    decision_map: dict = {}
    if proposal_ids:
        decisions = (
            db.query(DecisionModel)
            .filter(DecisionModel.proposal_id.in_(proposal_ids))
            .all()
        )
        decision_map = {d.proposal_id: d for d in decisions}

    result = []
    for p in proposals:
        base = ProposalRead.model_validate(p).model_dump()
        d = decision_map.get(p.id)
        base["decision"] = DecisionSummary.model_validate(d).model_dump() if d else None
        result.append(ProposalWithDecision(**base))
    return result


@router.get("/test-sample")
def download_test_sample(
    current_user: User = Depends(get_current_user),
):
    if not os.path.exists(_TEST_PROPOSAL_PATH):
        raise HTTPException(status_code=404, detail="Test proposal file not found on server")
    return FileResponse(
        path=_TEST_PROPOSAL_PATH,
        filename="AI_Pest_Control_Sample_Proposal.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.post("/submit-test", response_model=ProposalRead, status_code=status.HTTP_201_CREATED)
async def submit_test_proposal(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not os.path.exists(_TEST_PROPOSAL_PATH):
        raise HTTPException(status_code=404, detail="Test proposal file not found on server")

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"{uuid.uuid4()}.docx")
    with open(_TEST_PROPOSAL_PATH, "rb") as src, open(file_path, "wb") as dst:
        dst.write(src.read())

    proposal = Proposal(
        applicant_id=current_user.id,
        title="AI-Powered Pest Detection for Sustainable Crop Management [TEST]",
        applicant_name="Dr. Wei Chen",
        institution="University of Saskatchewan",
        file_path=file_path,
        original_filename="AI_Pest_Control_Sample_Proposal.docx",
        status=ProposalStatus.pending,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    from app.services.proposal_service import run_crew_pipeline
    background_tasks.add_task(run_crew_pipeline, proposal.id, file_path)
    return proposal


@router.get("/{proposal_id}/status", response_model=ProposalStatusRead)
def get_proposal_status(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if (
        current_user.role == UserRole.applicant
        and proposal.applicant_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    return proposal


@router.get("/{proposal_id}/download")
def download_proposal_file(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if (
        current_user.role == UserRole.applicant
        and proposal.applicant_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    if not proposal.file_path or not os.path.exists(proposal.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(
        path=proposal.file_path,
        filename=proposal.original_filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.get("/{proposal_id}", response_model=ProposalRead)
def get_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if (
        current_user.role == UserRole.applicant
        and proposal.applicant_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    return proposal
