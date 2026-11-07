from fastapi import APIRouter

from app.db.database import load_resume_id
from app.services.llm import MODEL
from app.services.vector_store import check_qdrant

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL,
        "resume_uploaded": load_resume_id() is not None,
        "qdrant_connected": await check_qdrant(),
    }
