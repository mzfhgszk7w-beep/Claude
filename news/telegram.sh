#!/usr/bin/env bash
# Schickt eine Nachricht an Telegram. Text kommt über stdin.
# Braucht TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID in der Umgebung und api.telegram.org als erlaubte Domain.
set -euo pipefail

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "telegram: TELEGRAM_BOT_TOKEN oder TELEGRAM_CHAT_ID fehlt, nichts gesendet" >&2
  exit 0
fi

text=$(cat)
code=$(curl -sS -m 20 -o /tmp/telegram-resp.json -w '%{http_code}' \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${text}" \
  --data-urlencode "disable_web_page_preview=true") || code=000

if [[ "$code" == "200" ]]; then
  echo "telegram: gesendet"
else
  echo "telegram: Fehler HTTP $code $(head -c 300 /tmp/telegram-resp.json 2>/dev/null)" >&2
fi
