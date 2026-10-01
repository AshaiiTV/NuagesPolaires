#!/usr/bin/env bash
# Reprend une session GPT (Codex CLI) interrompue. Usage : gpt-resume.sh <session-id> <rapport.md> < prompt.txt
set -euo pipefail
SESSION="$1"
OUT="$2"
CODEX=$(ls -t /c/Users/sacha/AppData/Local/OpenAI/Codex/bin/*/codex.exe | head -1)
cd /c/Users/sacha/NuagesPolaires
exec "$CODEX" exec resume --skip-git-repo-check -c 'sandbox_mode="workspace-write"' -o "$OUT" "$SESSION" -
