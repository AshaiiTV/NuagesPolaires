#!/usr/bin/env bash
# Lance GPT (Codex CLI, connecté via ChatGPT) en lecture seule sur le dépôt Nuages Polaires.
# Usage : gpt.sh <fichier-de-sortie.md> < prompt.txt   (le prompt est lu sur stdin)
# Le binaire change de dossier à chaque mise à jour de l'app : on prend le plus récent.
set -euo pipefail
OUT="$1"
CODEX=$(ls -t /c/Users/sacha/AppData/Local/OpenAI/Codex/bin/*/codex.exe | head -1)
exec "$CODEX" exec -c model_reasoning_effort=high --sandbox read-only --skip-git-repo-check -C "C:\\Users\\sacha\\NuagesPolaires" -o "$OUT" -
