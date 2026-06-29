#!/bin/sh
set -e

# entrypoint.sh — inyecta runtime config en window.env para SSO Portal.
# Ver BES-012 Frontend Runtime Configuration Specification.

OUTPUT_FILE="/usr/share/nginx/html/env.js"

REQUIRED_VARS="API_BASE_URL"
OPTIONAL_VARS="SENTRY_DSN"

missing=""
for key in $REQUIRED_VARS; do
  eval "value=\$$key"
  if [ -z "$value" ]; then
    missing="$missing $key"
  fi
done

if [ -n "$missing" ]; then
  echo "[entrypoint] ERROR: missing required runtime variables:$missing"
  exit 1
fi

{
  echo "window.env = {"
  first=1
  for key in $REQUIRED_VARS $OPTIONAL_VARS; do
    eval "value=\$$key"
    if [ -n "$value" ]; then
      if [ "$first" -eq 0 ]; then
        echo ","
      fi
      escaped=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n')
      printf '  "%s": "%s"' "$key" "$escaped"
      first=0
    fi
  done
  echo ""
  echo "};"
} > "$OUTPUT_FILE"

echo "[entrypoint] Generated $OUTPUT_FILE"

exec nginx -g 'daemon off;'
