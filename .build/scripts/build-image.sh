#!/usr/bin/env bash
set -euo pipefail
IMAGE="ghcr.io/${GITHUB_REPOSITORY,,}:${GITHUB_SHA}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
CONTEXT="${CONTEXT:-.}"
docker build -f "$DOCKERFILE" -t "$IMAGE" "$CONTEXT"
echo "IMAGE=$IMAGE" >> "$GITHUB_ENV"
