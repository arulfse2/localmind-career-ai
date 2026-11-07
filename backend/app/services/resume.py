from io import BytesIO
from pathlib import Path

import fitz
from docx import Document
from fastapi import HTTPException


def extract_text(filename: str, data: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        with fitz.open(stream=data, filetype="pdf") as pdf:
            return "\n".join(page.get_text() for page in pdf).strip()
    if ext == ".docx":
        document = Document(BytesIO(data))
        return "\n".join(
            paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()
        ).strip()
    if ext == ".txt":
        return data.decode("utf-8", errors="replace").strip()
    raise HTTPException(400, "Supported formats: PDF, DOCX, TXT.")


def build_search_query(
    role: str, country: str, keywords: str, profile: dict
) -> str:
    headline = str(profile.get("headline", "")).strip()
    profile_roles = profile.get("roles", [])
    profile_skills = profile.get("skills", [])
    roles = ", ".join(
        str(item)
        for item in (profile_roles[:5] if isinstance(profile_roles, list) else [])
    )
    skills = ", ".join(
        str(item)
        for item in (profile_skills[:8] if isinstance(profile_skills, list) else [])
    )
    return (
        f"Current job vacancies for {role} in {country}. "
        f"Candidate headline: {headline}. Related roles: {roles}. "
        f"Relevant skills: {skills}. Additional search terms: {keywords}. "
        "Prefer employer career pages and include job title, company, location, "
        "requirements, short description and original job URL."
    )
