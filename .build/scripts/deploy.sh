#!/usr/bin/env bash
set -euo pipefail
SSH_DIR="$(mktemp -d)"
trap 'rm -rf "$SSH_DIR"' EXIT
KEY="$SSH_DIR/key"
printf '%s\n' "$K3S_SSH_KEY" > "$KEY"
chmod 600 "$KEY"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=no "${K3S_USER:-root}@${K3S_HOST}")
REMOTE_DIR="/tmp/${APP_NAME}-deploy"
REMOTE_KUBECTL="KUBECONFIG=/home/deployer/.kube/config kubectl"
tar -C .build/k8s -cf - . | "${SSH[@]}" "rm -rf '$REMOTE_DIR' && mkdir -p '$REMOTE_DIR' && tar -C '$REMOTE_DIR' -xf -"
"${SSH[@]}" "$REMOTE_KUBECTL apply -f '$REMOTE_DIR'/*.yaml"
sed "s|IMAGE_PLACEHOLDER|${IMAGE}|g" .build/k8s/prod/deploy.yaml | "${SSH[@]}" "$REMOTE_KUBECTL apply -f -"
"${SSH[@]}" "$REMOTE_KUBECTL rollout status deployment/${DEPLOYMENT} -n ${NAMESPACE} --timeout=300s"
