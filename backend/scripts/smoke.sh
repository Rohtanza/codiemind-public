#!/usr/bin/env bash
set -euo pipefail
BASE=http://localhost:8000

echo "== /health =="
curl -s $BASE/health | tee /tmp/health.json
grep -q '"status":"ok"' /tmp/health.json

echo
echo "== store preference =="
PREF_ID=$(curl -s -X POST $BASE/memory/remember \
  -H "Content-Type: application/json" \
  -d '{"content":"Use arrow functions instead of function declarations","category":"style","scope_type":"project","importance":7}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "Stored: $PREF_ID"

echo
echo "== store decision =="
DEC_ID=$(curl -s -X POST $BASE/memory/decide \
  -H "Content-Type: application/json" \
  -d '{"content":"Use the Repository pattern for database access","rationale":"Swap MongoDB for Postgres later","scope_type":"project","importance":8}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "Stored: $DEC_ID"

echo
echo "== list memories =="
curl -s "$BASE/memory/list?scope=project" | python3 -m json.tool

echo
echo "== chat =="
curl -s -X POST $BASE/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"Write a function that validates an email address"}' | python3 -m json.tool

echo
echo "== last context =="
curl -s $BASE/context/last | python3 -m json.tool

echo
echo "== forget the preference =="
curl -s -X DELETE $BASE/memory/forget/$PREF_ID | python3 -m json.tool

echo
echo "DONE"
