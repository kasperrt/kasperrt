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
$KUBECTL -n static-sites exec "$POD" -- env STATIC_SITE_NAME="$STATIC_SITE_NAME" sh -c '
  set -eu
  sites_root=/usr/share/nginx/sites
  releases_root="$sites_root/.releases/$STATIC_SITE_NAME"
  release_id="$(date +%Y%m%d%H%M%S)"
  next_release="$releases_root/$release_id"
  current_link="$sites_root/$STATIC_SITE_NAME"

  mkdir -p "$next_release"
  tar -xzf /tmp/site.tar.gz -C "$next_release"
  rm /tmp/site.tar.gz

  ln -sfn ".releases/$STATIC_SITE_NAME/$release_id" "$current_link"

  find "$releases_root" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +4 | xargs -r rm -rf
'
