#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="$ROOT_DIR/.venv/bin/python"
NEXT="$ROOT_DIR/frontend/node_modules/.bin/next"
BACKEND_PID=""
TUNNEL_PID=""
FRONTEND_PID=""
RUN_DIR=""

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # Local .env is deliberately ignored by git; it can hold local Gist credentials.
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

for binary in "$PYTHON" "$NEXT"; do
  if [[ ! -x "$binary" ]]; then
    echo "Missing executable: $binary. Follow the setup instructions in README.md." >&2
    exit 1
  fi
done
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is required. Install Cloudflare Tunnel, then run this script again." >&2
  exit 1
fi

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  for pid in "$FRONTEND_PID" "$TUNNEL_PID" "$BACKEND_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$FRONTEND_PID" "$TUNNEL_PID" "$BACKEND_PID"; do
    [[ -z "$pid" ]] || wait "$pid" 2>/dev/null || true
  done
  [[ -z "$RUN_DIR" ]] || rm -rf "$RUN_DIR"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

RUN_DIR="$(mktemp -d)"
chmod 700 "$RUN_DIR"
cd "$ROOT_DIR"
"$PYTHON" -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cloudflared tunnel --url http://127.0.0.1:8000 --no-autoupdate \
  >"$RUN_DIR/cloudflared.log" 2>&1 &
TUNNEL_PID=$!

TUNNEL_URL=""
for attempt in {1..90}; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Backend exited before the tunnel started." >&2
    exit 1
  fi
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    cat "$RUN_DIR/cloudflared.log" >&2
    echo "Cloudflare Quick Tunnel exited before it became ready." >&2
    exit 1
  fi
  TUNNEL_URL="$(grep -Eo 'https://[[:alnum:].-]+\.trycloudflare\.com' "$RUN_DIR/cloudflared.log" | head -n 1 || true)"
  if [[ -n "$TUNNEL_URL" ]] && curl -fsS "$TUNNEL_URL/health" >/dev/null 2>&1; then
    break
  fi
  TUNNEL_URL=""
  sleep 1
done
if [[ -z "$TUNNEL_URL" ]]; then
  cat "$RUN_DIR/cloudflared.log" >&2
  echo "Timed out waiting for a healthy Cloudflare Quick Tunnel." >&2
  exit 1
fi

echo "Backend tunnel: $TUNNEL_URL"
"$PYTHON" "$ROOT_DIR/scripts/publish_tunnel_config.py" "$TUNNEL_URL"

(
  export NEXT_PUBLIC_BACKEND_URL="$TUNNEL_URL"
  cd "$ROOT_DIR/frontend"
  exec "$NEXT" dev --hostname 127.0.0.1
) &
FRONTEND_PID=$!

ready=false
for attempt in {1..120}; do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    wait "$FRONTEND_PID"
    echo "Frontend stopped before becoming ready." >&2
    exit 1
  fi
  if curl -fsS http://127.0.0.1:3000 >/dev/null; then
    ready=true
    break
  fi
  sleep 0.5
done
if [[ "$ready" != true ]]; then
  echo "Timed out waiting for the frontend." >&2
  exit 1
fi

echo "Reso Agent ready at http://127.0.0.1:3000"
echo "Tunnel URL is saved to the device only when supplied with ?backend=$TUNNEL_URL."
if command -v open >/dev/null 2>&1; then open http://127.0.0.1:3000; fi

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$TUNNEL_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done
