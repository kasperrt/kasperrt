#!/usr/bin/env bash
set -euo pipefail

: "${STATIC_SITE_NAME:?STATIC_SITE_NAME is required}"

KUBECTL="${KUBECTL:-kubectl}"
if [ -n "${KUBECONFIG:-}" ]; then
  KUBECTL="kubectl --kubeconfig ${KUBECONFIG}"
elif [ -f /home/deployer/.kube/config ]; then
  KUBECTL="kubectl --kubeconfig /home/deployer/.kube/config"
fi

$KUBECTL -n static-sites rollout status deployment/static-sites --timeout=300s
POD="$($KUBECTL -n static-sites get pod -l app=static-sites -o jsonpath='{.items[0].metadata.name}')"
$KUBECTL -n static-sites cp static-site.tar.gz "$POD:/tmp/site.tar.gz"
$KUBECTL -n static-sites exec "$POD" -- sh -c "rm -rf /usr/share/nginx/sites/${STATIC_SITE_NAME} && mkdir -p /usr/share/nginx/sites/${STATIC_SITE_NAME} && tar -xzf /tmp/site.tar.gz -C /usr/share/nginx/sites/${STATIC_SITE_NAME} && rm /tmp/site.tar.gz"
