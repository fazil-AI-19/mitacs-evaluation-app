import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.models import evaluation_config  # noqa: F401 — registers table with Base
from app.routers import auth, decisions, proposals, reviews
from app.routers import evaluation_config as evaluation_config_router

# Create tables on startup (Alembic is primary; this is a fallback)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mitacs Proposal Evaluation API", version="1.0.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(proposals.router)
app.include_router(reviews.router)
app.include_router(decisions.router)
app.include_router(evaluation_config_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve built React frontend when STATIC_DIR is configured
if settings.static_dir and os.path.isdir(settings.static_dir):
    _assets = os.path.join(settings.static_dir, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        candidate = os.path.join(settings.static_dir, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(settings.static_dir, "index.html"))
