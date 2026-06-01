#!/usr/bin/env bash
set -euo pipefail

: "${K3S_HOST:?K3S_HOST is required}"
: "${K3S_USER:?K3S_USER is required}"
: "${K3S_SSH_KEY:?K3S_SSH_KEY is required}"
: "${STATIC_SITE_NAME:?STATIC_SITE_NAME is required}"

SSH_DIR="$(mktemp -d)"
trap 'rm -rf "$SSH_DIR"' EXIT
KEY="$SSH_DIR/key"
printf '%s\n' "$K3S_SSH_KEY" > "$KEY"
chmod 600 "$KEY"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=no "${K3S_USER}@${K3S_HOST}")
REMOTE_KUBECTL="KUBECONFIG=/home/deployer/.kube/config kubectl"
REMOTE_ARCHIVE="/tmp/${STATIC_SITE_NAME}.tar.gz"

scp -i "$KEY" -o StrictHostKeyChecking=no static-site.tar.gz "${K3S_USER}@${K3S_HOST}:${REMOTE_ARCHIVE}"

"${SSH[@]}" "set -euo pipefail
$REMOTE_KUBECTL -n static-sites rollout status deployment/static-sites --timeout=300s
POD=\$( $REMOTE_KUBECTL -n static-sites get pod -l app=static-sites -o jsonpath='{.items[0].metadata.name}' )
$REMOTE_KUBECTL -n static-sites cp '${REMOTE_ARCHIVE}' \"\$POD:/tmp/site.tar.gz\"
$REMOTE_KUBECTL -n static-sites exec \"\$POD\" -- sh -c 'rm -rf /usr/share/nginx/sites/${STATIC_SITE_NAME} && mkdir -p /usr/share/nginx/sites/${STATIC_SITE_NAME} && tar -xzf /tmp/site.tar.gz -C /usr/share/nginx/sites/${STATIC_SITE_NAME} && rm /tmp/site.tar.gz'
rm -f '${REMOTE_ARCHIVE}'
"
