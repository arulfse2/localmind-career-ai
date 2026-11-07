import json
import sqlite3
import uuid
from contextlib import contextmanager
from typing import Any, Iterator

from app.core.config import DATABASE_PATH


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with _connect() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS candidate_profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                filename TEXT NOT NULL,
                resume_id TEXT NOT NULL,
                profile_json TEXT NOT NULL,
                resume_data BLOB NOT NULL DEFAULT X'',
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )"""
        )
        profile_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(candidate_profile)")
        }
        if "resume_id" not in profile_columns:
            connection.execute(
                "ALTER TABLE candidate_profile ADD COLUMN resume_id TEXT NOT NULL DEFAULT ''"
            )
        if "resume_data" not in profile_columns:
            connection.execute(
                "ALTER TABLE candidate_profile ADD COLUMN resume_data BLOB NOT NULL DEFAULT X''"
            )
        chunk_columns = {
            row["name"]: row["type"]
            for row in connection.execute("PRAGMA table_info(resume_chunks)")
        }
        if chunk_columns and chunk_columns.get("id", "").upper() != "TEXT":
            connection.execute("DROP TRIGGER IF EXISTS resume_chunks_ai")
            connection.execute("DROP TRIGGER IF EXISTS resume_chunks_ad")
            connection.execute("DROP TABLE IF EXISTS resume_chunks_fts")
            connection.execute("ALTER TABLE resume_chunks RENAME TO resume_chunks_legacy")
        connection.execute(
            """CREATE TABLE IF NOT EXISTS resume_chunks (
                id TEXT PRIMARY KEY,
                resume_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL
            )"""
        )


def save_resume(
    filename: str,
    resume_id: str,
    profile: dict[str, Any],
    chunks: list[str],
    resume_data: bytes = b"",
) -> str | None:
    previous = load_resume_id()
    with _connect() as connection:
        connection.execute(
            """INSERT INTO candidate_profile
               (id, filename, resume_id, profile_json, resume_data, updated_at)
               VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(id) DO UPDATE SET filename=excluded.filename,
               resume_id=excluded.resume_id,
               profile_json=excluded.profile_json, resume_data=excluded.resume_data,
               updated_at=CURRENT_TIMESTAMP""",
            (filename, resume_id, json.dumps(profile), resume_data),
        )
        connection.execute("DELETE FROM resume_chunks")
        connection.executemany(
            "INSERT INTO resume_chunks (id, resume_id, chunk_index, content) VALUES (?, ?, ?, ?)",
            [
                (
                    str(uuid.uuid5(uuid.NAMESPACE_URL, f"{resume_id}:{index}")),
                    resume_id,
                    index,
                    chunk,
                )
                for index, chunk in enumerate(chunks)
            ],
        )
    return previous


def load_resume_id() -> str | None:
    with _connect() as connection:
        row = connection.execute(
            "SELECT resume_id FROM candidate_profile WHERE id = 1"
        ).fetchone()
    return (row["resume_id"] or None) if row else None


def load_profile() -> dict[str, Any] | None:
    with _connect() as connection:
        row = connection.execute(
            "SELECT profile_json FROM candidate_profile WHERE id = 1"
        ).fetchone()
    return json.loads(row["profile_json"]) if row else None


initialize_database()
