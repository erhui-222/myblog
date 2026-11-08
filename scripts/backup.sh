#!/bin/sh
# SQLite 热备份 + 上传目录同步，保留最近 7 份。
# 关键点：WAL 模式下不能直接 cp 数据库文件，必须用 VACUUM INTO 生成一致快照。
#
# crontab 示例（每天 03:30）：
#   30 3 * * * /opt/myblog/scripts/backup.sh >> /var/log/myblog-backup.log 2>&1

set -eu

BACKUP_DIR="${BACKUP_DIR:-/var/backups/myblog}"
DB_PATH="${DB_PATH:-./data/db/blog.db}"
UPLOAD_DIR="${UPLOAD_DIR:-./data/uploads}"
KEEP="${KEEP:-7}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "[$(date '+%F %T')] 数据库不存在：$DB_PATH" >&2
  exit 1
fi

echo "[$(date '+%F %T')] 开始备份 $DB_PATH → $BACKUP_DIR/blog-$STAMP.db"
sqlite3 "$DB_PATH" "VACUUM INTO '$BACKUP_DIR/blog-$STAMP.db'"

if [ -d "$UPLOAD_DIR" ]; then
  tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
fi

# 只保留最近 N 份
ls -1t "$BACKUP_DIR"/blog-*.db 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "[$(date '+%F %T')] 备份完成，当前保留 $(ls -1 "$BACKUP_DIR"/blog-*.db 2>/dev/null | wc -l) 份"
