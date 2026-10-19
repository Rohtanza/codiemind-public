# CodieMind

CodieMind is a VS Code extension with a local FastAPI backend that stores a developer's coding
preferences and injects the relevant ones into an LLM coding assistant's prompt in later sessions.
This repository also contains a benchmark that measures whether those preferences are followed
across sessions, scored only by deterministic verifiers that read the generated code.

## Layout

| path | contents |
|---|---|
| `backend/` | FastAPI backend: preference store (SQLite + ChromaDB), scorer, prompt assembler, LLM client |
| `extension/` | VS Code extension: chat panel and memory panel |
| `verifiers/` | Verifier instrument: code extraction, compile gate, 52 rule verifiers with fixtures, registry |
| `benchmark/` | The case set (135 cases), the distractor store and the fixed filler sessions |
| `harness/` | Benchmark runner, harness self-test, run audit, analysis and diagnostics |

## Requirements

Python 3.12 with [`uv`](https://docs.astral.sh/uv/), Node.js 22 or later, VS Code 1.85 or later.
An OpenAI-compatible API key for model runs (put it in `backend/.env`, see `backend/.env.example`).

## Using CodieMind

```bash
cd backend && uv sync --frozen && uv run uvicorn app.main:app --port 8000
cd extension && npm install && npm run compile     # then press F5 in VS Code
```
In the chat panel: `@remember <preference>`, `@decide <decision> because <reason>`, `@memories`,
`@forget <id>`, `@context`; anything else is a code request.

## Checking the instrument

```bash
cd verifiers/bridge && npm ci && cd ../..
python3 verifiers/tests/test_instrument.py         # 29 checks, 0 failed
python3 verifiers/tests/test_g3_regression.py      # prose with a banned string + conforming code -> SATISFIED
python3 verifiers/registry.py check                # every registered verifier matches its hash
python3 verifiers/check_fixtures.py R44_66         # validate one rule's fixture set
cd backend && uv run --frozen python -m pytest -q  # backend tests (test_health needs an API key)
```

## Running the benchmark

```bash
# 1. harness self-test against the real backend with a fake model (no key needed)
uv run --project backend --frozen python harness/harness_selftest.py
# 2. start a backend for one model (settings and key in backend/.env), then run all 3,645 trials
export CODIEMIND_DATA_DIR=$HOME/cm-run-mymodel
(cd backend && uv run uvicorn app.main:app --port 8000) &
python3 harness/run_benchmark.py --model-label <model-id> --data-dir $CODIEMIND_DATA_DIR \
    --out harness/runs/<model-id>.jsonl          # resumable: rerun the same command after an interruption
# 3. audit and analyse (writes harness/out/)
python3 harness/analyze.py harness/runs/<model-id>.jsonl --outdir harness/out/
```
`run_benchmark.py --stub --out /tmp/stub.jsonl --limit 6 --reps 1` runs the whole scoring pipeline
on synthetic replies, with no model. `verify_runs.py` and `diagnostics.py` expect the three model
labels used in the study; edit `MODELS` at the top of each for other models.
# codiemind-public
