# LocalMind Career AI

## Prerequisites

- Node.js 20.9 or newer and npm
- The LocalMind backend running at `http://localhost:8000` (or configure
  `NEXT_PUBLIC_API_BASE_URL` to point to a different backend)

## Run the frontend

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set
`NEXT_PUBLIC_API_BASE_URL` in `.env.local` if the backend is not at
`http://localhost:8000`.

The dashboard supports local resume analysis, resume-grounded chat, live job
discovery through the Arbeitnow Job Board API, match explanations, and
job-specific career guidance. Resume details are not sent to Arbeitnow. Its UI uses
Lucide icons and shadcn/ui-compatible components; forms use React Hook Form and
Zod, shared workflow state uses Zustand, and assistant responses render through
React Markdown.

See the [project README](../README.md) for prerequisites and instructions to
start the backend and local services.

## Checks

```powershell
npm run lint
npm run build
```
