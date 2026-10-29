#!/usr/bin/env bash
# Backup diário do SQLite (cron: 0 3 * * * /srv/tecnoapis/app/deploy/backup.sh)
set -euo pipefail
DB=/srv/tecnoapis/data/app.db
OUT=/srv/tecnoapis/backups
mkdir -p "$OUT"
sqlite3 "$DB" ".backup '$OUT/app-$(date +%F-%H%M).db'"
gzip -f "$OUT"/app-*.db 2>/dev/null || true
find "$OUT" -name 'app-*.db.gz' -mtime +14 -delete
# Imagens enviadas pelo /admin (capas e fotos dos conteúdos): cópia espelhada; os nomes nunca se repetem
if [ -d /srv/tecnoapis/uploads ]; then rsync -a /srv/tecnoapis/uploads/ "$OUT/uploads/"; fi
# Cópia fora da VPS (Google Drive; remoto "gdrive" em /root/.config/rclone/rclone.conf). Só envia arquivos novos.
rclone copy "$OUT" gdrive:tecnoapis-backups
# Mesma retenção da VPS no Drive: só os backups do banco; as imagens (uploads/) ficam. O apagado vai para a lixeira do Drive.
rclone delete gdrive:tecnoapis-backups --min-age 14d --include "/app-*.db.gz"
