import re
import unicodedata
from html import unescape
from html.parser import HTMLParser
from typing import Any

import httpx

from app.core.config import ARBEITNOW_API_URL
from app.services.resume import build_search_query

MAX_MATCHES = 12
TOKEN_PATTERN = re.compile(r"[a-z0-9+#.]+", re.IGNORECASE)
STOP_WORDS = {
    "and", "for", "the", "with", "from", "this", "that", "into", "your",
    "role", "jobs", "job", "current", "vacancies", "candidate", "related",
    "relevant", "skills", "additional", "search", "terms", "prefer",
    "employer", "career", "pages", "include", "title", "company", "location",
    "requirements", "short", "description", "original", "url",
}
LOCATION_ALIASES = {
    "germany": (
        "deutschland", "berlin", "hamburg", "munich", "muenchen", "munchen",
        "frankfurt", "cologne", "koln", "koeln", "stuttgart", "dusseldorf",
        "dresden", "leipzig", "bremen", "hanover", "hannover",
    ),
    "united kingdom": (
        "uk", "great britain", "england", "scotland", "wales", "london",
        "manchester", "birmingham", "edinburgh", "glasgow", "bristol", "leeds",
    ),
    "united states": (
        "usa", "u.s.", "new york", "san francisco", "seattle", "austin",
        "boston", "chicago", "los angeles", "denver", "atlanta",
    ),
    "netherlands": ("the netherlands", "amsterdam", "rotterdam", "utrecht", "eindhoven"),
    "france": ("paris", "lyon", "marseille", "toulouse", "bordeaux"),
    "canada": ("toronto", "vancouver", "montreal", "montréal", "ottawa", "calgary"),
}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, _attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self.skip_depth += 1
        elif tag in {"p", "br", "li", "div", "h1", "h2", "h3"}:
            self.parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.skip_depth:
            self.skip_depth -= 1
        elif tag in {"p", "li", "div"}:
            self.parts.append(" ")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)


def plain_text(markup: str) -> str:
    decoded = markup
    for _ in range(3):
        unescaped = unescape(decoded)
        if unescaped == decoded:
            break
        decoded = unescaped
    parser = _TextExtractor()
    parser.feed(decoded)
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def _tokens(text: str) -> set[str]:
    return {
        token.lower()
        for token in TOKEN_PATTERN.findall(text)
        if len(token) > 1 and token.lower() not in STOP_WORDS
    }


def _normalized_location(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


def _location_matches(country: str, location: str) -> bool:
    requested = country.strip().casefold()
    if requested in {"", "global", "anywhere", "worldwide"}:
        return True
    requested_location = _normalized_location(requested)
    job_location = _normalized_location(location)
    aliases = LOCATION_ALIASES.get(requested_location, ())
    location_terms = (requested, *aliases)
    return any(
        re.search(
            rf"(?<!\w){re.escape(_normalized_location(term))}(?!\w)",
            job_location,
        )
        is not None
        for term in location_terms
    )


def _profile_terms(profile: dict[str, Any]) -> tuple[str, str]:
    headline = str(profile.get("headline", ""))
    roles = profile.get("roles", [])
    skills = profile.get("skills", [])
    role_text = " ".join(
        str(value) for value in (roles if isinstance(roles, list) else [])
    )
    skill_text = " ".join(
        str(value) for value in (skills if isinstance(skills, list) else [])
    )
    return f"{headline} {role_text}", skill_text


def normalize_listing(item: dict[str, Any]) -> dict[str, Any] | None:
    url = item.get("url")
    title = item.get("title")
    if not isinstance(url, str) or not url.startswith("https://"):
        return None
    if not isinstance(title, str) or not title.strip():
        return None
    tags = item.get("tags", [])
    job_types = item.get("job_types", [])
    if not isinstance(tags, list):
        tags = []
    if not isinstance(job_types, list):
        job_types = []
    description = plain_text(str(item.get("description", "")))
    company = str(item.get("company_name", "")).strip()
    location = str(item.get("location", "")).strip()
    return {
        "id": str(item.get("slug") or url),
        "title": title.strip(),
        "company": company,
        "location": location,
        "remote": bool(item.get("remote", False)),
        "job_types": [str(value) for value in job_types],
        "tags": [str(value) for value in tags],
        "url": url,
        "content": description[:6000],
        "match_score": 0,
        "match_reason": "",
    }


def preliminary_score(
    job: dict[str, Any],
    requested_role: str,
    country: str,
    keywords: str,
    profile: dict[str, Any],
) -> int:
    profile_roles, profile_skills = _profile_terms(profile)
    title_tokens = _tokens(job["title"])
    job_tokens = _tokens(
        " ".join(
            [
                job["title"],
                job["company"],
                job["location"],
                " ".join(job["tags"]),
                " ".join(job["job_types"]),
                job["content"],
            ]
        )
    )
    requested_tokens = _tokens(requested_role)
    role_tokens = _tokens(profile_roles)
    skill_tokens = _tokens(profile_skills)
    keyword_tokens = _tokens(keywords)
    location_tokens = _tokens(country)

    score = 0
    score += 12 * len(requested_tokens & title_tokens)
    score += 5 * len(requested_tokens & job_tokens)
    score += 7 * len(role_tokens & title_tokens)
    score += 3 * len(role_tokens & job_tokens)
    score += 4 * len(skill_tokens & job_tokens)
    score += 3 * len(keyword_tokens & job_tokens)
    score += 2 * len(location_tokens & _tokens(job["location"]))
    if _location_matches(country, job["location"]):
        score += 30
    if country.strip().lower() in {"global", "anywhere", "worldwide"}:
        score += 2
    if job["remote"]:
        score += 1
    return score


def score_listing(
    job: dict[str, Any],
    requested_role: str,
    country: str,
    keywords: str,
    profile: dict[str, Any],
) -> dict[str, Any]:
    profile_roles, profile_skills = _profile_terms(profile)
    job_title = _tokens(job["title"])
    job_text = _tokens(
        " ".join(
            [
                job["title"],
                job["company"],
                job["location"],
                " ".join(job["tags"]),
                " ".join(job["job_types"]),
                job["content"],
            ]
        )
    )
    requested_role_tokens = _tokens(requested_role)
    profile_role_tokens = _tokens(profile_roles)
    skill_tokens = _tokens(profile_skills)
    keyword_tokens = _tokens(keywords)

    role_match = len(requested_role_tokens & job_title) / max(
        1, len(requested_role_tokens)
    )
    profile_role_match = len(profile_role_tokens & job_title) / max(
        1, len(profile_role_tokens)
    )
    skill_match = len(skill_tokens & job_text) / max(1, len(skill_tokens))
    keyword_match = len(keyword_tokens & job_text) / max(1, len(keyword_tokens))
    location_match = _location_matches(country, job["location"])

    weights = (0.3, 0.1, 0.15, 0.05, 0.4)
    score = round(
        100
        * (
            weights[0] * role_match
            + weights[1] * profile_role_match
            + weights[2] * skill_match
            + weights[3] * keyword_match
            + weights[4] * location_match
        )
    )

    profile_skills_value = profile.get("skills", [])
    matched_skills = [
        str(skill)
        for skill in (
            profile_skills_value if isinstance(profile_skills_value, list) else []
        )
        if _tokens(str(skill)) & job_text
    ]
    reasons = []
    if role_match:
        reasons.append("The title matches your target role.")
    if profile_role_match:
        reasons.append("The title overlaps with roles in your resume.")
    if matched_skills:
        reasons.append(f"The listing mentions {', '.join(matched_skills[:5])}.")
    if location_match and country.strip().lower() not in {
        "",
        "global",
        "anywhere",
        "worldwide",
    }:
        reasons.append("The location matches your preference.")
    if not reasons:
        reasons.append("Limited role, skill, or location overlap was found.")

    job["match_score"] = score
    job["match_reason"] = " ".join(reasons)
    job["gaps"] = []
    return job


async def fetch_matching_jobs(
    role: str,
    country: str,
    keywords: str,
    profile: dict[str, Any],
) -> tuple[str, list[dict[str, Any]]]:
    query = build_search_query(role, country, keywords, profile)
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(ARBEITNOW_API_URL, params={"page": 1})
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"Arbeitnow Job Board API returned HTTP {exc.response.status_code}."
        ) from exc
    except httpx.HTTPError as exc:
        raise RuntimeError("Could not connect to the Arbeitnow Job Board API.") from exc
    except ValueError as exc:
        raise RuntimeError("Arbeitnow returned an invalid JSON response.") from exc

    listings = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(listings, list):
        raise RuntimeError("Arbeitnow returned an unexpected response format.")

    normalized = [
        listing
        for item in listings
        if isinstance(item, dict)
        if (listing := normalize_listing(item)) is not None
    ]
    normalized.sort(
        key=lambda job: preliminary_score(job, role, country, keywords, profile),
        reverse=True,
    )
    matches = [
        score_listing(job, role, country, keywords, profile)
        for job in normalized[:MAX_MATCHES]
    ]
    matches.sort(key=lambda job: job["match_score"], reverse=True)
    return query, matches
