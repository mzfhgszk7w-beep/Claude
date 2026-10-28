#!/usr/bin/env bash
# Schickt eine Nachricht an Telegram. Text kommt über stdin.
# Braucht TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID in der Umgebung und api.telegram.org als erlaubte Domain.
set -euo pipefail

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "telegram: TELEGRAM_BOT_TOKEN fehlt, nichts gesendet" >&2
  exit 0
fi

# Ohne TELEGRAM_CHAT_ID: Chat aus der letzten Nachricht an den Bot ermitteln (z. B. /start).
if [[ -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  TELEGRAM_CHAT_ID=$(curl -sS -m 20 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates" |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const r=JSON.parse(s).result||[];const m=r.reverse().map(u=>u.message||u.channel_post).find(Boolean);process.stdout.write(m?String(m.chat.id):"")}catch{}})') || true
  if [[ -z "$TELEGRAM_CHAT_ID" ]]; then
    echo "telegram: keine Chat-ID gefunden. Dem Bot eine Nachricht schicken (z. B. /start) oder TELEGRAM_CHAT_ID setzen." >&2
    exit 0
  fi
fi

text=$(cat)

# TELEGRAM_CHAT_ID darf mehrere IDs enthalten, durch Komma getrennt (z. B. Kanal und Privatchat).
IFS=',' read -ra chats <<< "$TELEGRAM_CHAT_ID"
for chat in "${chats[@]}"; do
  chat=${chat// /}
  [[ -z "$chat" ]] && continue
  code=$(curl -sS -m 20 -o /tmp/telegram-resp.json -w '%{http_code}' \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${chat}" \
    --data-urlencode "text=${text}" \
    --data-urlencode "disable_web_page_preview=${TELEGRAM_NO_PREVIEW:-false}") || code=000

  if [[ "$code" == "200" ]]; then
    echo "telegram: gesendet an $chat"
  else
    echo "telegram: Fehler an $chat HTTP $code $(head -c 300 /tmp/telegram-resp.json 2>/dev/null)" >&2
  fi
done
