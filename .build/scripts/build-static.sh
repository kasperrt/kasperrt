#!/usr/bin/env bash
set -euo pipefail
pnpm install --frozen-lockfile
pnpm build
tar -C build -czf static-site.tar.gz .
