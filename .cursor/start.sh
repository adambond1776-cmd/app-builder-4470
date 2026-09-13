#!/usr/bin/env bash
# Per-boot service reconciliation: ensure MongoDB is running and ready.
# Idempotent: does nothing if mongod is already up.
set -euo pipefail

sudo mkdir -p /data/db /var/log/mongodb
sudo chown -R "$(whoami)" /data/db /var/log/mongodb || true

if ! pgrep -x mongod >/dev/null 2>&1; then
  echo "[start] Launching mongod..."
  mongod --dbpath /data/db --bind_ip 127.0.0.1 \
    --logpath /var/log/mongodb/mongod.log --fork
fi

# Wait for readiness before returning.
for _ in $(seq 1 30); do
  if mongosh --quiet --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1; then
    echo "[start] MongoDB is ready."
    exit 0
  fi
  sleep 1
done

echo "[start] MongoDB did not become ready in time." >&2
exit 1
