#!/usr/bin/env bash
set -euo pipefail

echo "Running tests before deployment..."
cd "$(dirname "$0")/.."/ml
if ! command -v tox >/dev/null 2>&1; then
  python3 -m pip install --user tox
fi

tox -e test-all

echo "Deploying to Railway..."
if ! command -v railway >/dev/null 2>&1; then
  npm i -g @railway/cli >/dev/null
fi

railway up

# Simple health check (requires RAILWAY_ML_API_URL to be set in environment or Railway CLI context)
if [ -n "${RAILWAY_ML_API_URL:-}" ]; then
  echo "Health check: $RAILWAY_ML_API_URL/api/v1/health"
  curl -fsS "$RAILWAY_ML_API_URL/api/v1/health" | jq . || true
fi

echo "Done."
