#!/usr/bin/env bash
# Stage 6, one model: variance diagnostic then the full run . Resumable: rerun to continue.
# Usage: run_model.sh <label> <model-id> <port>
set -uo pipefail
label=$1; model=$2; port=$3
cd "$(dirname "$0")/.."
R=harness/runs
python3 harness/run_benchmark.py --model-label "$model" --backend "http://127.0.0.1:$port" \
  --data-dir "$HOME/cm-run-$label" --cases R58_4-plain R10_35-plain R15_14-plain R14_3-plain R18_27-plain \
  --reps 10 --arms C --sizes 10 --out "$R/variance_$model.jsonl" || exit $?
python3 harness/run_benchmark.py --model-label "$model" --backend "http://127.0.0.1:$port" \
  --data-dir "$HOME/cm-run-$label" --out "$R/$model.jsonl"
