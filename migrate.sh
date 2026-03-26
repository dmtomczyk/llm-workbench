#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "Backend virtualenv not found at $VENV_DIR" >&2
  echo "Run ./bootstrap.sh first." >&2
  exit 1
fi

cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"

echo "==> Running Alembic migrations"
alembic upgrade head

echo "==> Migration complete"
