import os
from pathlib import Path

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parents[2]
load_dotenv(BASE / ".env")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "qwen3:1.7b")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
MAX_RESUME_MB = int(os.getenv("MAX_RESUME_MB", "10"))
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(BASE / "data" / "localmind.db")))
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "localmind_resume_chunks")
ARBEITNOW_API_URL = os.getenv(
    "ARBEITNOW_API_URL", "https://www.arbeitnow.com/api/job-board-api"
)
