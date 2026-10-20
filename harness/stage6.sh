#!/usr/bin/env bash
# Stage 6 control: start / status / stop the three pre-registered model runs.
#   ./stage6.sh start    start Ollama, the three backends, and the three runs (safe to repeat)
#   ./stage6.sh status   progress per model and whether everything is finished
#   ./stage6.sh stop     stop the runs and backends (recorded trials are kept)
# Runs are resumable: a run that stops (network drop, rate limit) is restarted after 60 s by its
# retry loop, and the runner skips trials already recorded. Nothing is scored from an error.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
R="$HERE/runs"; LOG="$R/logs"; mkdir -p "$LOG"
OLLAMA="$HOME/.local/ollama/bin/ollama"
MODELS=("gpt4omini gpt-4o-mini-2024-07-18 8010" "qwen3coder qwen.qwen3-coder-30b-a3b-instruct 8011" "deepseekv32 deepseek.v3.2 8012")
FULL=3645; VAR=50

up() { curl -s -m 3 -o /dev/null "$1"; }

start() {
  if ! up http://127.0.0.1:11434/api/version; then
    echo "starting Ollama (embeddings)"; nohup "$OLLAMA" serve > "$LOG/ollama.log" 2>&1 &
    until up http://127.0.0.1:11434/api/version; do sleep 1; done
  fi
  for spec in "${MODELS[@]}"; do
    set -- $spec; label=$1; model=$2; port=$3
    if ! up "http://127.0.0.1:$port/docs"; then
      echo "starting backend $label on :$port"
      nohup "$HERE/serve_model.sh" "$label" "$port" "$HOME/cm-run-$label" false > "$LOG/serve_$label.log" 2>&1 &
      until up "http://127.0.0.1:$port/docs"; do sleep 1; done
    fi
    if pgrep -f "stage6-loop $label" >/dev/null; then
      echo "$label: already running"
    else
      echo "$label: starting run (auto-retry on failure)"
      nohup bash -c "exec -a 'stage6-loop $label' bash -c '
        until \"$HERE/run_model.sh\" $label $model $port >> \"$LOG/run_$label.log\" 2>&1; do
          echo \"[\$(date)] run stopped (see above); retrying in 60 s\" >> \"$LOG/run_$label.log\"; sleep 60
        done; echo \"[\$(date)] FINISHED\" >> \"$LOG/run_$label.log\"'" >/dev/null 2>&1 &
    fi
  done
  echo; echo "Started. Check progress with:  $0 status"
}

count() { [ -f "$1" ] && wc -l < "$1" || echo 0; }

status() {
  all=1
  printf "%-36s %10s %12s  %s\n" model variance full state
  for spec in "${MODELS[@]}"; do
    set -- $spec; label=$1; model=$2
    v=$(count "$R/variance_$model.jsonl"); f=$(count "$R/$model.jsonl")
    if [ "$v" -ge $VAR ] && [ "$f" -ge $FULL ]; then st="DONE"
    elif pgrep -f "stage6-loop $label" >/dev/null; then st="running"; all=0
    else st="STOPPED (run ./stage6.sh start)"; all=0; fi
    printf "%-36s %6s/%-3s %6s/%-5s  %s\n" "$model" "$v" "$VAR" "$f" "$FULL" "$st"
  done
  echo
  for spec in "${MODELS[@]}"; do
    set -- $spec; n=$(grep -c "retrying in 60 s" "$LOG/run_$1.log" 2>/dev/null); echo "$1: ${n:-0} restarts after errors, last log line: $(tail -n 1 "$LOG/run_$1.log" 2>/dev/null | cut -c1-110)"
  done
  echo
  [ $all = 1 ] && echo "ALL THREE RUNS FINISHED." || echo "Not finished yet."
}

stop() {
  pkill -f "stage6-loop" ; pkill -f "harness/run_benchmark.py"
  for p in 8010 8011 8012; do pid=$(ss -ltnp 2>/dev/null | grep ":$p " | grep -oP 'pid=\K[0-9]+' | head -1); [ -n "$pid" ] && kill "$pid"; done
  echo "stopped runs and backends (Ollama left running; recorded trials kept)"
}

case "${1:-status}" in start) start ;; status) status ;; stop) stop ;; *) echo "usage: $0 start|status|stop" ;; esac
