# LocalMind Career AI

LocalMind is a private career assistant that analyzes a resume, discovers relevant
jobs, compares listings with a candidate profile, and provides resume- and
job-grounded career guidance.

## What it does

- Extracts resumes in PDF, DOCX, and TXT formats using the local backend.
- Uses a local Ollama model for resume analysis and career chat.
- Stores the candidate profile and resume chunks in SQLite.
- Stores resume embeddings in Qdrant for semantic retrieval.
- Fetches job listings from the public Arbeitnow Job Board API and ranks them
  locally against the requested role, location, and resume profile.
- Keeps the resume file and full resume text out of the Arbeitnow search request.

## Prerequisites

- Windows, macOS, or Linux
- Python 3.11 or newer
- Node.js 20.9 or newer and npm
- Docker Desktop (or another Docker installation) with Docker Compose
- [Ollama](https://ollama.com/) installed and running locally

Pull the models used by default:

```powershell
ollama pull qwen3:1.7b
ollama pull nomic-embed-text
```

Ollama's local API should be available at `http://localhost:11434`.

## Run locally

### 1. Start Qdrant

From the project root:

```powershell
docker compose -f infrastructure\docker-compose.yml up -d qdrant
```

Qdrant is available at `http://localhost:6333`. Docker Compose stores its data
in a named volume.

### 2. Configure and start the backend

In a PowerShell terminal from the project root:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
py -3 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -e backend
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`; interactive API documentation
is at `http://localhost:8000/docs`. The default SQLite database is created at
`backend\data\localmind.db`.

### 3. Configure and start the frontend

Open a second PowerShell terminal from the project root:

```powershell
if (-not (Test-Path frontend\.env.local)) { Copy-Item frontend\.env.local.example frontend\.env.local }
Set-Location frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. The frontend's default API URL points to the local
backend at `http://localhost:8000`.

## Configuration

Backend service settings are in `backend\.env.example`; copy it to
`backend\.env` for local overrides. Frontend settings are in
`frontend\.env.local.example`; copy it to `frontend\.env.local`.

Do not commit local environment files, candidate resumes, or the SQLite database.
Only the generated example environment files belong in source control.

## Project structure

```text
backend/          FastAPI API, integrations, SQLite persistence, and tests
frontend/         Next.js application
infrastructure/   Docker Compose services (Qdrant)
```

See the component guides for details:

- [Backend setup and API](backend/README.md)
- [Frontend setup and checks](frontend/README.md)

## Development checks

Backend tests:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest
```

Frontend lint and production build:

```powershell
Set-Location frontend
npm run lint
npm run build
```
