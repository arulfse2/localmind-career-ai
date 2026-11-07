import json
import re
from typing import Any

import httpx

from app.core.config import OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL

OLLAMA = OLLAMA_BASE_URL
MODEL = OLLAMA_CHAT_MODEL


async def local_chat(messages: list[dict[str, str]], json_mode: bool = False) -> str:
    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(
            f"{OLLAMA}/api/chat",
            json={
                "model": MODEL,
                "messages": messages,
                "stream": False,
                "format": "json" if json_mode else "",
                "options": {"temperature": 0.1, "num_ctx": 3072},
            },
        )
        response.raise_for_status()
        return response.json()["message"]["content"]


def parse_json(text: str) -> Any:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    return json.loads(text)
