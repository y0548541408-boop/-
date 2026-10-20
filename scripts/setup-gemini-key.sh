#!/usr/bin/env bash
# One-time setup for the meeting-recording feature.
# Asks for the Gemini API key (hidden, never printed or committed), stores it in
# .env.local and in Vercel (Production), then redeploys so the live site gets it.
set -euo pipefail
cd "$(dirname "$0")/.."

read -rsp "הדבק את מפתח ה-Gemini ולחץ Enter (לא יוצג על המסך): " KEY
echo
if [ -z "$KEY" ]; then
  echo "לא הוזן מפתח. יוצא."
  exit 1
fi

touch .env.local
grep -v '^GEMINI_API_KEY=' .env.local > .env.local.tmp || true
printf 'GEMINI_API_KEY=%s\n' "$KEY" >> .env.local.tmp
mv .env.local.tmp .env.local
echo "נשמר ב-.env.local"

# printf, not echo: a trailing newline inside the key breaks authentication.
npx vercel env rm GEMINI_API_KEY production --yes >/dev/null 2>&1 || true
printf '%s' "$KEY" | npx vercel env add GEMINI_API_KEY production
echo "נשמר ב-Vercel (Production). מפרסם מחדש..."

npx vercel --prod --yes
echo "סיום. אפשר להעלות הקלטה."
