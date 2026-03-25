#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PID=""
FRONTEND_PID=""

log() {
  printf '\n==> %s\n' "$1"
}

cleanup() {
  set +e
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    log "Stopping backend ($BACKEND_PID)"
    kill "$BACKEND_PID" >/dev/null 2>&1
  fi
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    log "Stopping frontend ($FRONTEND_PID)"
    kill "$FRONTEND_PID" >/dev/null 2>&1
  fi
  wait >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "Backend virtualenv not found at $VENV_DIR" >&2
  echo "Run ./bootstrap.sh first." >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Frontend dependencies not found in $FRONTEND_DIR/node_modules" >&2
  echo "Run ./bootstrap.sh first." >&2
  exit 1
fi

log "Starting backend on http://localhost:$BACKEND_PORT"
cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"
uvicorn app.main:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT" &
BACKEND_PID=$!
deactivate

log "Starting frontend on http://localhost:$FRONTEND_PORT"
cd "$FRONTEND_DIR"
npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

cat <<EOF

Development servers are starting.

Backend:
  http://localhost:$BACKEND_PORT
Frontend:
  http://localhost:$FRONTEND_PORT

Press Ctrl+C to stop both.
EOF

wait "$BACKEND_PID" "$FRONTEND_PID"
