#!/usr/bin/env bash
# Idempotent dependency setup for the app-builder-4470 stack
# (FastAPI backend + React/CRACO frontend + MongoDB).
# Safe to run repeatedly; only does work that is missing.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- 1. System dependency: MongoDB 8.0 (Ubuntu 24.04 "noble") ---
if ! command -v mongod >/dev/null 2>&1; then
  echo "[install] Installing MongoDB 8.0..."
  sudo apt-get install -y gnupg curl >/dev/null
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y mongodb-org
fi

# --- 2. Python venv tooling ---
if ! dpkg -s python3.12-venv >/dev/null 2>&1; then
  echo "[install] Installing python3.12-venv..."
  sudo apt-get install -y python3.12-venv
fi

# --- 3. backend/.env (secrets sourced from injected env vars when present) ---
if [ ! -f backend/.env ]; then
  echo "[install] Writing backend/.env..."
  cat > backend/.env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=max_coach
CORS_ORIGINS=*
ADMIN_TOKEN=${ADMIN_TOKEN:-adm_1771f205fb49b1910a7172bc4f532d16}
EMERGENT_LLM_KEY=${EMERGENT_LLM_KEY:-}
RESEND_API_KEY=${RESEND_API_KEY:-}
EOF
fi

# --- 4. frontend/.env ---
if [ ! -f frontend/.env ]; then
  echo "[install] Writing frontend/.env..."
  cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=0
EOF
fi

# --- 5. Backend Python dependencies ---
cd backend
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --upgrade pip
# emergentintegrations is published on Emergent's package index.
pip install -r requirements.txt \
  --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
deactivate
cd "$REPO_ROOT"

# --- 6. Frontend dependencies ---
cd frontend
yarn install --frozen-lockfile 2>/dev/null || yarn install
cd "$REPO_ROOT"

echo "[install] Done."
