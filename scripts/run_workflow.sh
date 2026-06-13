#!/usr/bin/env bash
# Dispatch one or more GitHub Actions workflows on the current repo.
#
# Reads token from $GH_TOKEN, $GITHUB_TOKEN, or ~/.config/geostrat-gh-token
# (in that order). Token must have `repo` + `workflow` scopes.
#
# Usage:
#   scripts/run_workflow.sh build-history.yml
#   scripts/run_workflow.sh build-history.yml update-vdem.yml update-power.yml

set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <workflow.yml> [<workflow.yml> ...]" >&2
  exit 2
fi

TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ] && [ -f "$HOME/.config/geostrat-gh-token" ]; then
  TOKEN=$(tr -d '[:space:]' < "$HOME/.config/geostrat-gh-token")
fi
if [ -z "$TOKEN" ]; then
  echo "no token found. set GH_TOKEN or write one to ~/.config/geostrat-gh-token" >&2
  exit 1
fi

# Owner/repo from the origin URL — works for both SSH and HTTPS remotes.
ORIGIN=$(git config --get remote.origin.url)
case "$ORIGIN" in
  git@github.com:*) SLUG="${ORIGIN#git@github.com:}" ;;
  https://github.com/*) SLUG="${ORIGIN#https://github.com/}" ;;
  *) echo "unrecognised origin URL: $ORIGIN" >&2; exit 1 ;;
esac
SLUG="${SLUG%.git}"
REF=$(git symbolic-ref --short HEAD 2>/dev/null || echo main)

for wf in "$@"; do
  echo "dispatch: $wf on $SLUG@$REF"
  status=$(curl -s -o /tmp/wf-resp -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$SLUG/actions/workflows/$wf/dispatches" \
    -d "{\"ref\":\"$REF\"}")
  if [ "$status" = "204" ]; then
    echo "  -> queued"
  else
    echo "  -> HTTP $status"
    head -c 400 /tmp/wf-resp; echo
  fi
done
