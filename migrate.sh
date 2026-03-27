#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"

run_backend_migrations() {
  local py="$VENV_DIR/bin/python"
  local mode
  mode="$(cd "$BACKEND_DIR" && "$py" - <<'PY'
from app.core.config import get_settings
import sqlite3
from pathlib import Path

settings = get_settings()
url = settings.database_url_resolved
if not url.startswith('sqlite:///'):
    print('upgrade')
    raise SystemExit

path = Path(url.removeprefix('sqlite:///'))
if not path.exists():
    print('upgrade')
    raise SystemExit

conn = sqlite3.connect(path)
cur = conn.cursor()
cur.execute("select name from sqlite_master where type='table'")
tables = {row[0] for row in cur.fetchall()}
if 'alembic_version' not in tables:
    print('upgrade')
    conn.close()
    raise SystemExit
cur.execute('select version_num from alembic_version')
rows = cur.fetchall()
non_alembic_tables = tables - {'alembic_version'}
if not rows and non_alembic_tables:
    print('stamp')
else:
    print('upgrade')
conn.close()
PY
)"

  if [[ "$mode" == "stamp" ]]; then
    echo "==> Detected existing SQLite schema with empty alembic_version; stamping current DB to head"
    (cd "$BACKEND_DIR" && "$py" -m alembic stamp head)
  else
    (cd "$BACKEND_DIR" && "$py" -m alembic upgrade head)
  fi
}

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "Backend virtualenv not found at $VENV_DIR" >&2
  echo "Run ./bootstrap.sh first." >&2
  exit 1
fi

echo "==> Running Alembic migrations"
run_backend_migrations

echo "==> Migration complete"
