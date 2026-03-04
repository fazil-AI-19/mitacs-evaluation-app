# Mitacs Proposal Evaluation App

A web application for evaluating Mitacs research proposals using AI-powered multi-agent review via the [CrewAI](https://crewai.com/) framework.

## How it works

1. **Applicant** registers, logs in, and uploads a `.docx` research proposal with title, applicant name, and institution.
2. A **CrewAI pipeline** automatically runs three AI agents in sequence:
   - **Preliminary Review Agent** — checks completeness and Mitacs eligibility criteria
   - **Research Review Agent** — evaluates scientific merit and feasibility
   - **Decision Agent** — produces a weighted score (0–100) and recommendation: Accept / Reject / Revise & Resubmit
3. A **human reviewer** logs in, views the AI review panels and recommendation, then approves or overrides the decision.
4. The **applicant** can then see their feedback.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, FastAPI, SQLAlchemy, SQLite |
| AI | CrewAI, OpenAI GPT-4o |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Auth | JWT (python-jose + passlib bcrypt) |

---

## Project Structure

```
mitacs-evaluation-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings via pydantic-settings (.env)
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/              # ORM models (user, proposal, review, decision)
│   │   ├── schemas/             # Pydantic schemas + CrewAI output models
│   │   ├── routers/             # API route handlers
│   │   ├── core/                # JWT security + dependencies
│   │   ├── crew/                # CrewAI agents, tasks, YAML config
│   │   └── services/            # Business logic (pipeline, persistence)
│   ├── alembic/                 # DB migrations
│   ├── uploads/                 # Uploaded .docx files (runtime, gitignored)
│   ├── requirements.txt
│   ├── .env                     # Your local config (not committed)
│   ├── .env.example             # Template
│   └── seed.py                  # Creates test accounts
└── frontend/
    ├── src/
    │   ├── App.tsx              # React Router setup
    │   ├── api/                 # Axios API modules
    │   ├── auth/                # JWT auth context + route guard
    │   ├── pages/               # applicant/ and reviewer/ pages
    │   ├── components/          # UI components
    │   └── hooks/               # useProposalStatus polling hook
    └── package.json
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- An OpenAI API key (for GPT-4o)

---

### Backend Setup

```bash
cd backend

# 1. Copy and edit environment config
cp .env.example .env
# Edit .env: set your OPENAI_API_KEY and update the absolute paths

# 2. Install Python dependencies
pip3 install -r requirements.txt

# 3. Run database migrations
python3 -m alembic upgrade head

# 4. Seed test accounts
python3 seed.py
# Creates:
#   reviewer@mitacs.ca / ReviewPass123!
#   applicant@university.ca / ApplicantPass123!

# 5. Start the backend server
PYTHONPATH=$(pwd) python3 -m uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

> **Note:** The frontend proxies `/api/*` to the backend via Vite. Alternatively, set `VITE_API_URL=http://localhost:8000` in a `frontend/.env.local` file.

---

## Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `SECRET_KEY` | Random string for JWT signing |
| `DATABASE_URL` | SQLite absolute path, e.g. `sqlite:////path/to/backend/mitacs.db` |
| `UPLOAD_DIR` | Absolute path to uploads directory, e.g. `/path/to/backend/uploads` |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `LLM_MODEL` | Model name (default: `gpt-4o`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry (default: `60`) |

> **Important:** Use absolute paths for `DATABASE_URL` and `UPLOAD_DIR`.

---

## API Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register applicant account |
| POST | `/auth/login` | Public | Returns JWT |
| GET | `/auth/me` | Any | Current user |
| POST | `/proposals/` | Applicant | Upload `.docx` + metadata |
| GET | `/proposals/my` | Applicant | My proposals |
| GET | `/proposals/` | Reviewer | All proposals (with `?status_filter=`) |
| GET | `/proposals/{id}/status` | Both | Polling status endpoint |
| GET | `/reviews/{proposal_id}` | Reviewer | Agent review results |
| GET | `/decisions/{proposal_id}` | Both | AI decision |
| POST | `/decisions/{proposal_id}/override` | Reviewer | Approve or override decision |

---

## CrewAI Pipeline

The pipeline in `backend/app/crew/` runs three agents sequentially:

1. **Preliminary Review** (`preliminary_review_agent`): reads the `.docx` via `DOCXSearchTool`, checks all required Mitacs sections and eligibility. Outputs a `PreliminaryReviewOutput` with a completeness score (0–100).

2. **Research Review** (`research_review_agent`): evaluates scientific merit across 5 dimensions (clarity, novelty, methodology, outcomes, timeline), each scored 1–5. Outputs a `ResearchReviewOutput` with an overall score (0–100).

3. **Decision** (`decision_agent`): aggregates both reviews (40% completeness + 60% scientific merit), computes a weighted final score, and produces a `DecisionOutput` with recommendation (Accept ≥75, Revise & Resubmit 50–74, Reject <50), justification, strengths, weaknesses, and action items.

---

## User Roles

**Applicant** (self-registered):
- Submit proposals (`/applicant/submit`)
- View their proposals and feedback (`/applicant/proposals`)

**Reviewer** (seeded by admin via `seed.py`):
- View all proposals with status filter (`/reviewer/dashboard`)
- Review AI evaluations and approve or override decisions (`/reviewer/proposals/:id`)

---

## End-to-End Verification

1. Start the backend: `PYTHONPATH=$(pwd) python3 -m uvicorn app.main:app --reload --port 8000`
2. Start the frontend: `npm run dev` (from `frontend/`)
3. Register as an applicant at `http://localhost:5173/register`
4. Submit a `.docx` proposal at `/applicant/submit`
5. Watch the status badge update: **Pending → Processing → Awaiting Review** (polls every 5s)
6. Log in as `reviewer@mitacs.ca` and open the proposal at `/reviewer/dashboard`
7. Review the Preliminary and Research panels, and the AI Decision Card
8. Submit a final recommendation (approve or override)
9. Log back in as the applicant — feedback is now visible on the My Proposals page
