import asyncio

from app.api.routes import jobs as jobs_route
from app.db import database
from app.schemas.jobs import DiscoverRequest
from app.services.arbeitnow import (
    normalize_listing,
    preliminary_score,
    score_listing,
)
from app.services.resume import build_search_query


def test_resume_profile_and_chunks_persist_in_sqlite(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "career.db")
    database.initialize_database()

    previous = database.save_resume(
        "resume.txt",
        "resume-123",
        {"headline": "Software Engineer", "skills": ["Python"]},
        ["Built APIs and services.", "Led a software engineering team."],
        b"local resume file",
    )

    assert previous is None
    assert database.load_profile()["headline"] == "Software Engineer"
    assert database.load_resume_id() == "resume-123"


def test_job_search_uses_resume_roles_and_skills_without_resume_text():
    query = build_search_query(
        "Backend Engineer",
        "Canada",
        "remote",
        {
            "headline": "Senior Platform Developer",
            "roles": ["Backend Engineer", "Team Lead"],
            "skills": ["Python", "FastAPI"],
            "private_resume_text": "confidential full resume body",
        },
    )

    assert "Backend Engineer" in query
    assert "Canada" in query
    assert "Senior Platform Developer" in query
    assert "Team Lead" in query
    assert "Python" in query
    assert "FastAPI" in query
    assert "confidential full resume body" not in query


def test_arbeitnow_listing_is_normalized_and_html_is_removed():
    job = normalize_listing(
        {
            "slug": "python-platform-engineer",
            "company_name": "Example GmbH",
            "title": "Python Platform Engineer",
            "description": "<p>Build APIs with Python.</p><script>hidden()</script>",
            "remote": True,
            "url": "https://www.arbeitnow.com/jobs/python-platform-engineer",
            "tags": ["Engineering"],
            "job_types": ["Full Time"],
            "location": "Berlin",
        }
    )

    assert job is not None
    assert job["company"] == "Example GmbH"
    assert job["location"] == "Berlin"
    assert job["remote"] is True
    assert job["content"] == "Build APIs with Python."
    assert "hidden" not in job["content"]


def test_arbeitnow_double_encoded_description_html_is_removed():
    job = normalize_listing(
        {
            "slug": "redwood-senior-software-engineer",
            "company_name": "Redwoodsoftware",
            "title": "Senior Software Engineer",
            "description": (
                "&lt;p&gt;&lt;strong&gt;&lt;em&gt;OUR MISSION&lt;/em&gt;"
                "&lt;/strong&gt;&lt;/p&gt;&lt;p&gt;At Redwood, we empower "
                "our customers with reliable automation.&lt;/p&gt;"
            ),
            "url": "https://www.arbeitnow.com/jobs/redwood-senior-software-engineer",
            "location": "Remote",
        }
    )

    assert job is not None
    assert job["content"] == (
        "OUR MISSION At Redwood, we empower our customers with reliable automation."
    )
    assert "<p>" not in job["content"]
    assert "<strong>" not in job["content"]


def test_arbeitnow_matching_prioritizes_role_and_resume_skills():
    common = {
        "company": "Example GmbH",
        "location": "Berlin",
        "remote": False,
        "job_types": ["Full Time"],
        "tags": ["Engineering"],
        "content": "Build production services.",
    }
    matching = {
        **common,
        "title": "Senior Python Backend Engineer",
        "content": "Build Python APIs with FastAPI.",
    }
    unrelated = {**common, "title": "Marketing Campaign Manager"}
    profile = {
        "headline": "Backend Engineer",
        "roles": ["Python Developer"],
        "skills": ["Python", "FastAPI"],
    }

    assert preliminary_score(matching, "Backend Engineer", "Germany", "", profile) > (
        preliminary_score(unrelated, "Backend Engineer", "Germany", "", profile)
    )
    scored = score_listing(
        matching, "Backend Engineer", "Germany", "", profile
    )
    assert 0 <= scored["match_score"] <= 100
    assert "Python" in scored["match_reason"]
    assert scored["gaps"] == []


def test_arbeitnow_matching_prioritizes_requested_country_and_german_cities():
    common = {
        "title": "Software Engineer",
        "company": "Example GmbH",
        "remote": False,
        "job_types": ["Full Time"],
        "tags": [],
        "content": "Build software.",
    }
    germany_job = {**common, "location": "München, Bayern"}
    uk_job = {**common, "location": "London, UK"}

    germany_score = score_listing(
        germany_job, "Software Engineer", "Germany", "", {}
    )["match_score"]
    uk_score = score_listing(
        uk_job, "Software Engineer", "Germany", "", {}
    )["match_score"]
    assert germany_score > uk_score


def test_job_discovery_preserves_api_shape_and_scores_local_listings(monkeypatch):
    source_jobs = [
        {
            "id": "python-engineer",
            "title": "Python Engineer",
            "company": "Example GmbH",
            "location": "Berlin",
            "remote": False,
            "job_types": ["Full Time"],
            "tags": ["Engineering"],
            "url": "https://www.arbeitnow.com/jobs/python-engineer",
            "content": "Build APIs.",
            "match_score": 0,
            "match_reason": "",
        }
    ]

    async def fake_fetch(role, country, keywords, profile):
        return (
            "local matching criteria",
            [
                score_listing(job, role, country, keywords, profile)
                for job in source_jobs
            ],
        )

    monkeypatch.setattr(jobs_route, "load_profile", lambda: {"skills": ["Python"]})
    monkeypatch.setattr(jobs_route, "fetch_matching_jobs", fake_fetch)
    jobs_route.jobs.clear()

    response = asyncio.run(
        jobs_route.discover(
            DiscoverRequest(role="Python Engineer", country="Germany", keywords="")
        )
    )

    assert response["query"] == "local matching criteria"
    assert response["count"] == 1
    assert response["jobs"][0]["company"] == "Example GmbH"
    assert response["jobs"][0]["match_score"] > 0
