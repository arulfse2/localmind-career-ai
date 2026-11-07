from fastapi import APIRouter

from app.api.routes import health, jobs, resume

router = APIRouter(prefix="/api")
router.include_router(health.router, tags=["health"])
router.include_router(resume.router, tags=["resume"])
router.include_router(jobs.router, tags=["jobs"])
