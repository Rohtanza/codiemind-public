# CodieMind Backend

FastAPI service implementing the Episodic Memory, PreferenceScorer, and
ContextAssembler for CodieMind. Talks to the VS Code extension over HTTP.

## Setup

Requires Python 3.11+ and `uv` (https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
cp .env.example .env      # then edit .env with your Gemini API key
```

## Run

```bash
uv run uvicorn app.main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
```

## Tests

```bash
uv run pytest
```
