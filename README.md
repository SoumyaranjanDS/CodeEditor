# AuraCode

AuraCode is a personal DSA-focused coding workspace: a minimal IDE, a safe execution backend, and a path toward profiling and optimization feedback.

## MVP scope

The first build targets:

- React + Tailwind frontend
- Monaco-powered editor shell
- FastAPI backend with a typed `/api/run` contract
- Python and C++ as the first supported languages
- local-first architecture with room for a runner container

## Monorepo layout

```text
AuraCode/
  apps/
    web/       React frontend
    api/       FastAPI backend
  infra/
    runner/    container notes and future sandbox config
```

## Current status

This repo is scaffolded for the MVP. The frontend currently uses a local textarea fallback so the UI can be built before Monaco is installed. The backend exposes a health check and a stubbed run endpoint with typed responses.

## Recommended local setup

### 1. Install dependencies

- Node.js 24 is already available on this machine.
- Install Python 3.11 or newer.
- If PowerShell blocks `npm`, use `npm.cmd` instead.

### 2. Frontend

```powershell
cd C:\Users\soumy\OneDrive\Documents\AuraCode\apps\web
npm.cmd install
npm.cmd run dev
```

### 3. Backend

```powershell
cd C:\Users\soumy\OneDrive\Documents\AuraCode\apps\api
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Near-term roadmap

### Phase 1

- install Monaco and replace textarea editor
- connect the web app to the API
- show stdout, stderr, timing, and run status

### Phase 2

- implement local Python runner
- implement local C++ compile-and-run flow
- add timeout, output limits, and structured errors

### Phase 3

- split compile time and run time
- add repeated-run metrics
- introduce charts in DSA mode

### Phase 4

- save run history
- add optimized reference solutions
- build diff view and conservative hints

## Architecture notes

- The API should remain separate from the code execution layer.
- For personal local use, a subprocess-based runner is acceptable for the first prototype.
- Before any public deployment, execution must move to a hardened container or stronger sandbox.
