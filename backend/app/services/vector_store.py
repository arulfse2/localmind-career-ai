from uuid import NAMESPACE_URL, uuid5

import httpx
from qdrant_client import AsyncQdrantClient, models

from app.core.config import (
    OLLAMA_BASE_URL,
    OLLAMA_EMBEDDING_MODEL,
    QDRANT_COLLECTION,
    QDRANT_URL,
)

OLLAMA = OLLAMA_BASE_URL
EMBEDDING_MODEL = OLLAMA_EMBEDDING_MODEL
COLLECTION = QDRANT_COLLECTION
EMBED_BATCH_SIZE = 32

client = AsyncQdrantClient(url=QDRANT_URL)


async def embed(texts: list[str]) -> list[list[float]]:
    try:
        async with httpx.AsyncClient(timeout=90) as http:
            response = await http.post(
                f"{OLLAMA}/api/embed",
                json={"model": EMBEDDING_MODEL, "input": texts},
            )
            response.raise_for_status()
            vectors = response.json()["embeddings"]
    except (httpx.HTTPError, KeyError) as exc:
        raise RuntimeError(
            f"Could not create resume embeddings with Ollama model {EMBEDDING_MODEL}."
        ) from exc
    if len(vectors) != len(texts) or not vectors or not vectors[0]:
        raise RuntimeError("Ollama returned an invalid embedding response.")
    return vectors


async def _ensure_collection(vector_size: int) -> None:
    try:
        exists = await client.collection_exists(COLLECTION)
        if not exists:
            await client.create_collection(
                collection_name=COLLECTION,
                vectors_config=models.VectorParams(
                    size=vector_size, distance=models.Distance.COSINE
                ),
            )
        else:
            info = await client.get_collection(COLLECTION)
            configured_size = info.config.params.vectors.size
            if configured_size != vector_size:
                raise RuntimeError(
                    f"Qdrant collection {COLLECTION!r} has vector size "
                    f"{configured_size}, but Ollama returned {vector_size}. "
                    "Use a fresh collection name or matching embedding model."
                )
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"Cannot access Qdrant at {QDRANT_URL}. Start the Qdrant container and retry."
        ) from exc


async def index_resume(resume_id: str, chunks: list[str]) -> None:
    for batch_start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[batch_start : batch_start + EMBED_BATCH_SIZE]
        vectors = await embed(batch)
        await _ensure_collection(len(vectors[0]))
        try:
            await client.upsert(
                collection_name=COLLECTION,
                points=[
                    models.PointStruct(
                        id=str(uuid5(NAMESPACE_URL, f"{resume_id}:{index}")),
                        vector=vector,
                        payload={
                            "resume_id": resume_id,
                            "chunk_index": index,
                            "content": chunk,
                        },
                    )
                    for index, (chunk, vector) in enumerate(
                        zip(batch, vectors), start=batch_start
                    )
                ],
                wait=True,
            )
        except Exception as exc:
            raise RuntimeError("Failed to index resume chunks in Qdrant.") from exc


async def remove_resume(resume_id: str) -> None:
    try:
        await client.delete(
            collection_name=COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="resume_id", match=models.MatchValue(value=resume_id)
                        )
                    ]
                )
            ),
            wait=True,
        )
    except Exception as exc:
        raise RuntimeError("Failed to remove replaced resume vectors from Qdrant.") from exc


async def search_resume(resume_id: str, query: str, limit: int = 4) -> list[str]:
    vectors = await embed([query])
    await _ensure_collection(len(vectors[0]))
    try:
        response = await client.query_points(
            collection_name=COLLECTION,
            query=vectors[0],
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="resume_id", match=models.MatchValue(value=resume_id)
                    )
                ]
            ),
            limit=limit,
            with_payload=True,
        )
    except Exception as exc:
        raise RuntimeError("Failed to search resume vectors in Qdrant.") from exc
    return [
        str(point.payload["content"])
        for point in response.points
        if point.payload and point.payload.get("content")
    ]


async def check_qdrant() -> bool:
    try:
        await client.get_collections()
        return True
    except Exception:
        return False


async def close_qdrant() -> None:
    await client.close()
