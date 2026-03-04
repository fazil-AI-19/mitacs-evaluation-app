"""
Seed the database with default accounts for testing.

Reviewer: reviewer@mitacs.ca / ReviewPass123!
Applicant: applicant@university.ca / ApplicantPass123!
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


def seed():
    db = SessionLocal()
    try:
        # Create reviewer if not exists
        if not db.query(User).filter(User.email == "reviewer@mitacs.ca").first():
            reviewer = User(
                email="reviewer@mitacs.ca",
                hashed_password=hash_password("ReviewPass123!"),
                full_name="Dr. Jane Reviewer",
                role=UserRole.reviewer,
            )
            db.add(reviewer)
            print("Created reviewer: reviewer@mitacs.ca / ReviewPass123!")
        else:
            print("Reviewer already exists, skipping.")

        # Create test applicant if not exists
        if not db.query(User).filter(User.email == "applicant@university.ca").first():
            applicant = User(
                email="applicant@university.ca",
                hashed_password=hash_password("ApplicantPass123!"),
                full_name="John Applicant",
                role=UserRole.applicant,
            )
            db.add(applicant)
            print("Created applicant: applicant@university.ca / ApplicantPass123!")
        else:
            print("Applicant already exists, skipping.")

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
