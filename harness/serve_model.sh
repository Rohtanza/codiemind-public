#!/usr/bin/env bash
# Start the CodieMind backend for one benchmark model.
# Usage: serve_model.sh <gpt4omini|qwen3coder|deepseekv32> <port> <data_dir> [HISTORY_ENABLED]
# Keys are read from codiemind/backend/.env at run time; nothing secret is written here.
set -euo pipefail
label=$1; port=$2; data=$3; hist=${4:-false}
cd "$(dirname "$0")/../backend"
val() { grep "^$1=" .env | cut -d= -f2-; }
export CODIEMIND_DATA_DIR="$data" HISTORY_ENABLED="$hist" LLM_PROVIDER=openai \
       OPENAI_EMBEDDING_MODEL=nomic-embed-text EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1
case "$label" in
  gpt4omini)   export OPENAI_CHAT_MODEL=gpt-4o-mini-2024-07-18 REQUIRE_PINNED_CHAT_MODEL=true ;;
  qwen3coder)  export OPENAI_API_KEY="$(val BEDROCK_API_KEY)" OPENAI_BASE_URL="$(val BEDROCK_BASE_URL)" \
                      OPENAI_CHAT_MODEL=qwen.qwen3-coder-30b-a3b-instruct ;;
  deepseekv32) export OPENAI_API_KEY="$(val BEDROCK_API_KEY)" OPENAI_BASE_URL="$(val BEDROCK_BASE_URL)" \
                      OPENAI_CHAT_MODEL=deepseek.v3.2 ;;
  *) echo "unknown model label $label" >&2; exit 2 ;;
esac
mkdir -p "$data"
exec uv run --frozen uvicorn app.main:app --port "$port"
