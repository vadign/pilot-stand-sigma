#!/bin/sh
set -eu

PORT="${SIGMA_PORT:-4173}"

npm run sync:live
npm run build

export SIGMA_RUN_STARTUP_SYNC=false
exec node --import tsx scripts/start.mts --host 0.0.0.0 --port "$PORT"
