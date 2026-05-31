#!/usr/bin/env bash
set -euo pipefail
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
docker push "$IMAGE"
