#!/usr/bin/env bash
# Lance GPT (Codex CLI) comme IMPLÉMENTEUR : écriture autorisée dans le dépôt Nuages Polaires uniquement
# (bac à sable workspace-write, pas d'accès réseau, pas de git push possible).
# Usage : gpt-write.sh <fichier-rapport.md> < prompt.txt
set -euo pipefail
OUT="$1"
CODEX=$(ls -t /c/Users/sacha/AppData/Local/OpenAI/Codex/bin/*/codex.exe | head -1)
exec "$CODEX" exec -c model_reasoning_effort=high --sandbox workspace-write --skip-git-repo-check -C "C:\\Users\\sacha\\NuagesPolaires" -o "$OUT" -
