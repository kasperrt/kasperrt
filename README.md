Insert more meta-humor here 🌊

## Static Sites Deployment

This branch deploys to k3s as the shared `static-sites` workload.

The first hosted site is `kasperrt.me`, built by Astro and copied into:

```text
/usr/share/nginx/sites/kasperrt.me
```

To add another static-only site without creating another Kubernetes app:

1. Add the built files into another folder under `/usr/share/nginx/sites/...`
   in `Dockerfile`.
2. Add a matching `server` block in `.build/nginx.conf`.
3. Add the hostname to `.build/k8s/03-ingress.yaml`.
4. Add the hostname to `~/dev/infra/cluster/deployments.tf` under
   `static-sites`.
5. Rebuild and deploy `static-sites` from `~/dev/infra`.

Deploy command:

```bash
scripts/vm-build-deploy.sh \
  --repo git@github.com:kasperrt/kasperrt.git \
  --branch chore/k3s-build-deploy-fresh \
  --app static-sites \
  --namespace static-sites \
  --deployment static-sites
```
