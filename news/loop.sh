#!/usr/bin/env bash
# Sammelt in einer Schleife alle 15 Minuten, bis kurz vor dem Job-Timeout.
# GitHub startet geplante Läufe unzuverlässig; ein langer Lauf überbrückt die Lücken.
set -uo pipefail

INTERVAL=${INTERVAL:-900}
MAX_SECONDS=${MAX_SECONDS:-20700}   # 5 h 45 min
START=$(date +%s)
REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

git config user.name "news-bot"
git config user.email "news-bot@users.noreply.github.com"

round() {
  git pull -q --rebase || git rebase --abort || true
  node news/collect.mjs | tail -1
  node news/laender-collect.mjs | tail -1
  git add data/news
  if ! git diff --cached --quiet; then
    git commit -q -m "news: collect $(date -u +%Y-%m-%dT%H:%MZ)"
    for i in 1 2 3; do git pull -q --rebase && git push -q && break; sleep 5; done
  fi

  # Bilder der letzten 3 Stunden auf dem Branch news-images (ohne Historie, wird jedes Mal ersetzt).
  rm -rf /tmp/img && mkdir -p /tmp/img
  if git fetch -q --depth=1 origin news-images; then
    git --work-tree=/tmp/img checkout FETCH_HEAD -- . && git reset -q
  fi
  node news/images.mjs /tmp/img
  (
    cd /tmp/img && rm -rf .git && git init -q -b news-images && git add -A &&
    git -c user.name=news-bot -c user.email=news-bot@users.noreply.github.com commit -q -m "news images $(date -u +%Y-%m-%dT%H:%MZ)" &&
    git push -q -f "$REPO_URL" news-images
  ) || echo "images push failed"
}

while :; do
  round
  elapsed=$(( $(date +%s) - START ))
  if (( elapsed + INTERVAL > MAX_SECONDS )); then echo "done after ${elapsed}s"; break; fi
  sleep "$INTERVAL"
done
