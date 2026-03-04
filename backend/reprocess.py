import asyncio
import sys
sys.path.insert(0, "/Users/fazil/mitacs-evaluation-app/backend")

# Load environment variables before any app imports
from dotenv import load_dotenv
load_dotenv("/Users/fazil/mitacs-evaluation-app/backend/.env")

# Import all models so SQLAlchemy can resolve all FK relationships
from app.models.user import User  # noqa: F401
from app.models.review import AgentReview  # noqa: F401
from app.models.decision import Decision  # noqa: F401

from app.database import SessionLocal
from app.models.proposal import Proposal, ProposalStatus
from app.services.proposal_service import run_crew_pipeline

async def main():
    db = SessionLocal()
    proposals = db.query(Proposal).all()
    db.close()

    print(f"Found {len(proposals)} proposals to process")
    for p in proposals:
        print(f"  [{p.id}] {p.title} — {p.file_path}")

    for p in proposals:
        print(f"\nProcessing proposal {p.id}: {p.title} ...")
        await run_crew_pipeline(p.id, p.file_path)
        print(f"Done: proposal {p.id}")

asyncio.run(main())
