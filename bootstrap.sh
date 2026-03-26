#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"
WITH_DEV=0
WITH_PARSERS=0
SKIP_FRONTEND=0
SKIP_BACKEND=0

usage() {
  cat <<'EOF'
Usage: ./bootstrap.sh [options]

Sets up the BRIDGE project locally.

Options:
  --with-dev         Install backend dev/test dependencies
  --with-parsers     Install optional file parser dependencies
  --skip-backend     Skip backend Python environment setup
  --skip-frontend    Skip frontend npm install
  -h, --help         Show this help

Examples:
  ./bootstrap.sh
  ./bootstrap.sh --with-dev --with-parsers
EOF
}

log() {
  printf '\n==> %s\n' "$1"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    return 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-dev)
      WITH_DEV=1
      ;;
    --with-parsers)
      WITH_PARSERS=1
      ;;
    --skip-backend)
      SKIP_BACKEND=1
      ;;
    --skip-frontend)
      SKIP_FRONTEND=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "This script must live at the project root and expects backend/ and frontend/ directories." >&2
  exit 1
fi

if [[ "$SKIP_BACKEND" -eq 0 ]]; then
  need_cmd python3 || {
    echo "Install Python 3 first. On Debian/Ubuntu: sudo apt install -y python3 python3-venv python3-pip" >&2
    exit 1
  }

  log "Setting up backend virtual environment"
  if [[ ! -d "$VENV_DIR" ]]; then
    python3 -m venv "$VENV_DIR" || {
      echo "python3 -m venv failed. On Debian/Ubuntu, install: sudo apt install -y python3-venv" >&2
      exit 1
    }
  fi

  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"

  log "Upgrading pip"
  python -m pip install --upgrade pip

  log "Installing backend dependencies"
  if [[ "$WITH_DEV" -eq 1 ]]; then
    python -m pip install -e "$BACKEND_DIR"[dev]
  else
    python -m pip install -e "$BACKEND_DIR"
  fi

  if [[ "$WITH_PARSERS" -eq 1 ]]; then
    log "Installing optional parser dependencies"
    python -m pip install pandas openpyxl python-docx pypdf extract-msg
  fi

  log "Backend dependency check"
  python - <<'PY'
import fastapi, sqlalchemy, yaml, httpx, jinja2, jsonschema
print('backend deps ok')
PY

  deactivate
fi

if [[ "$SKIP_FRONTEND" -eq 0 ]]; then
  need_cmd npm || {
    echo "Install Node.js and npm first." >&2
    exit 1
  }

  log "Installing frontend dependencies"
  cd "$FRONTEND_DIR"
  npm install
  cd "$ROOT_DIR"
fi

cat <<EOF

Bootstrap complete.

Next steps:
  Apply DB migrations:
    cd "$ROOT_DIR"
    ./migrate.sh

  Backend:
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    alembic upgrade head
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8080

  Frontend:
    cd "$FRONTEND_DIR"
    npm run dev

Helpful options:
  ./bootstrap.sh --with-dev
  ./bootstrap.sh --with-dev --with-parsers
EOF
