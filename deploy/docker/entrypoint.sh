#!/bin/sh
set -eu

PORT="${SIGMA_PORT:-4173}"

npm run build

exec node --import tsx scripts/start.mts --host 0.0.0.0 --port "$PORT"
