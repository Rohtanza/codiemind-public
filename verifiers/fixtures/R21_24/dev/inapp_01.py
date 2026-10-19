import sys

MAX_RETRIES = 3
TIMEOUT_SECONDS = 30

if len(sys.argv) > 1:
    name = sys.argv[1]
else:
    name = "world"

print(f"Hello, {name}! Retries: {MAX_RETRIES}, timeout: {TIMEOUT_SECONDS}s")
