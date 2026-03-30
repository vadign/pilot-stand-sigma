#!/bin/sh
set -eu

PORT="${SIGMA_PORT:-5173}"

exec node --import tsx scripts/dev.mts --host 0.0.0.0 --port "$PORT"
