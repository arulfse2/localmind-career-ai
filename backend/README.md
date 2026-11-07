# LocalMind Career AI backend

## Prerequisites

- Python 3.11 or newer
- Ollama running locally with `qwen3:1.7b` and `nomic-embed-text` available
- Docker Desktop with Docker Compose for Qdrant

## Local services

Run Qdrant using Docker Desktop from the repository root:

```powershell
docker compose -f infrastructure\docker-compose.yml up -d qdrant
```

Install Ollama models used for chat and resume embeddings:

```powershell
ollama pull qwen3:1.7b
ollama pull nomic-embed-text
```

From the project root, create the local settings file if it does not already
exist:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
```

Job listings come from the public
Arbeitnow Job Board API; no search account or API key is required. Listings are
ranked locally against the requested role/location and extracted resume headline,
roles, and skills. Resume files and full text are not sent to Arbeitnow.

Install the Python dependencies from the `backend` directory:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
```

## Start the API

From `backend`:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

The backend dependencies and package metadata are defined in `pyproject.toml`.
Install the project in editable mode to make its dependencies available during
development.

See the [project README](../README.md) for the complete local setup sequence.

## Storage and routes

- `app\api\routes\` contains the health, resume, and job endpoints; shared endpoint
  registration lives in `app\api\router.py`.
- `app\core\` contains application configuration and shared runtime state.
- `app\db\` contains SQLite persistence; `app\schemas\` contains request models
  grouped by domain; `app\services\` contains Ollama, Qdrant, resume, and job-board
  integrations.
- SQLite at `backend\data\localmind.db` stores the candidate profile, original
  resume bytes, and extracted resume text chunks.
- Qdrant at `http://localhost:6333` stores Ollama-generated vectors and chunk
  payloads for semantic resume retrieval.
- `POST /api/resume/chat` answers questions using retrieved resume chunks.
- `POST /api/jobs/discover` retrieves current Arbeitnow listings and scores them
  against the requested role/location and extracted profile.
- `POST /api/jobs/chat` grounds role-specific guidance in resume chunks and the
  selected search result. Discovered job state is held in backend memory and is
  cleared when the API restarts.
- `GET /api/health` reports whether a resume is stored and whether Qdrant is
  reachable.

Override service settings in `.env`; see `.env.example` for supported names.
Arbeitnow listings are refreshed hourly by their API; the backend fetches its
first page for each discovery request and ranks the results locally.

## Test

```powershell
.\.venv\Scripts\python.exe -m pytest
```
