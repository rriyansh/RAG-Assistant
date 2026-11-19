#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="$ROOT_DIR/.venv/bin/python"
NEXT="$ROOT_DIR/frontend/node_modules/.bin/next"
BACKEND_PID=""
FRONTEND_PID=""

if [[ ! -x "$PYTHON" ]]; then
  echo "Python environment missing. Run the setup commands in README.md first." >&2
  exit 1
fi
if [[ ! -x "$NEXT" ]]; then
  echo "Frontend dependencies missing. Run npm --prefix frontend install first." >&2
  exit 1
fi

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  [[ -z "$FRONTEND_PID" ]] || wait "$FRONTEND_PID" 2>/dev/null || true
  [[ -z "$BACKEND_PID" ]] || wait "$BACKEND_PID" 2>/dev/null || true
  exit "$status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd "$ROOT_DIR"
"$PYTHON" -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
(cd "$ROOT_DIR/frontend" && exec "$NEXT" dev --hostname 127.0.0.1) &
FRONTEND_PID=$!

ready=false
for attempt in {1..120}; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    wait "$BACKEND_PID"
    echo "Backend stopped before becoming ready." >&2
    exit 1
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    wait "$FRONTEND_PID"
    echo "Frontend stopped before becoming ready." >&2
    exit 1
  fi
  if curl -fsS http://127.0.0.1:8000/health >/dev/null &&
    curl -fsS http://127.0.0.1:3000 >/dev/null; then
    ready=true
    break
  fi
  sleep 0.5
done

if [[ "$ready" != true ]]; then
  echo "Timed out waiting for the backend and frontend to become ready." >&2
  exit 1
fi

echo "Preview ready: http://127.0.0.1:3000 (backend: http://127.0.0.1:8000)"
if command -v open >/dev/null 2>&1; then
  open http://127.0.0.1:3000
fi

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done
