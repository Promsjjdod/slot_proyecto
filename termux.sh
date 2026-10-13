#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-5173}"
URL="http://127.0.0.1:${PORT}/"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

if [[ ! "$PORT" =~ ^[0-9]{1,5}$ ]]; then
  fail "PORT must be a number between 1024 and 65535 (got: $PORT)."
fi
PORT=$((10#$PORT))
if ((PORT < 1024 || PORT > 65535)); then
  fail "PORT must be a number between 1024 and 65535 (got: $PORT)."
fi

if ! command -v node >/dev/null 2>&1; then
  if command -v pkg >/dev/null 2>&1; then
    printf 'Installing Node.js LTS with Termux pkg…\n'
    pkg install -y nodejs-lts
  else
    fail "Node.js 22+ is required. In Termux run: pkg install nodejs-lts"
  fi
fi

command -v npm >/dev/null 2>&1 || fail "npm was not found. Reinstall Node.js with: pkg install nodejs-lts"
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if ((NODE_MAJOR < 22)); then
  fail "Node.js 22+ is required; found $(node --version). Run: pkg install nodejs-lts"
fi

DEPENDENCY_LOCK="$ROOT_DIR/node_modules/.package-lock.json"
if [[ ! -x "$ROOT_DIR/node_modules/.bin/vite" || ! -f "$DEPENDENCY_LOCK" || "$ROOT_DIR/package-lock.json" -nt "$DEPENDENCY_LOCK" || "$ROOT_DIR/package.json" -nt "$DEPENDENCY_LOCK" ]]; then
  printf 'Installing project dependencies (first run may take a few minutes)…\n'
  (cd "$ROOT_DIR" && npm ci)
fi

printf 'Starting Bruma de Jade at %s\n' "$URL"
(cd "$ROOT_DIR" && "$ROOT_DIR/node_modules/.bin/vite" --host "$HOST" --port "$PORT" --strictPort) &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

READY=0
for ((ATTEMPT = 0; ATTEMPT < 40; ATTEMPT += 1)); do
  if node -e 'fetch(process.argv[1]).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))' "$URL" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if ((READY == 0)); then
  fail "Vite did not respond at $URL. If the port is busy, try: PORT=5174 ./termux.sh"
fi

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || printf 'Open this address in your Android browser: %s\n' "$URL"
else
  printf 'Open this address in your Android browser: %s\n' "$URL"
fi
printf 'Keep this Termux session running; press Ctrl+C to stop the local server.\n'
wait "$SERVER_PID"
