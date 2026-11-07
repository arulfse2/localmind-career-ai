from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.services.vector_store import close_qdrant


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await close_qdrant()


app = FastAPI(title="LocalMind Career AI", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
