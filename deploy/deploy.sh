#!/usr/bin/env bash
# Deploy: build + restart. Rode como root: /srv/tecnoapis/app/deploy/deploy.sh
set -euo pipefail
cd /srv/tecnoapis/app
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git remote get-url origin >/dev/null 2>&1; then git pull --ff-only; fi
npm ci --no-audit --no-fund
npm run build
systemctl restart tecnoapis
sleep 2
systemctl is-active tecnoapis && curl -fsS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:4321/
