#!/usr/bin/env bash
# BlueGofer — Redis RDB backup to S3
# Step 15.12.4 — runs via systemd timer every 6h
# Authority: TDD Appendix B ("Redis: BGSAVE to S3 every 6h")

set -euo pipefail

S3_BUCKET="bluegofer-staging-logs-390630836942"
S3_PREFIX="redis-backups"
REDIS_CONTAINER="bluegofer-redis"
LOG_TAG="redis-backup"
LOCAL_TMP="/tmp/redis-backup-$$.rdb"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")

log() { echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [$LOG_TAG] $*"; }

log "Starting Redis backup"

docker exec "$REDIS_CONTAINER" redis-cli BGSAVE >/dev/null
log "BGSAVE triggered"

for i in $(seq 1 60); do
  IN_PROGRESS=$(docker exec "$REDIS_CONTAINER" redis-cli INFO persistence | grep -E '^rdb_bgsave_in_progress:' | tr -d '\r' | cut -d: -f2)
  if [ "$IN_PROGRESS" = "0" ]; then break; fi
  sleep 1
done

STATUS=$(docker exec "$REDIS_CONTAINER" redis-cli INFO persistence | grep -E '^rdb_last_bgsave_status:' | tr -d '\r' | cut -d: -f2)
if [ "$STATUS" != "ok" ]; then
  log "ERROR: BGSAVE status = $STATUS"
  exit 1
fi
log "BGSAVE completed: $STATUS"

docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$LOCAL_TMP"
SIZE=$(stat -c%s "$LOCAL_TMP" 2>/dev/null || stat -f%z "$LOCAL_TMP")
log "Copied dump.rdb to host ($SIZE bytes)"

S3_KEY="s3://${S3_BUCKET}/${S3_PREFIX}/redis-${TIMESTAMP}.rdb"
aws s3 cp "$LOCAL_TMP" "$S3_KEY" --only-show-errors
log "Uploaded to $S3_KEY"

rm -f "$LOCAL_TMP"
log "Backup complete"

aws cloudwatch put-metric-data --namespace "Bluegofer/Backups" --metric-name "RedisBackupSize" --value "$SIZE" --unit Bytes --region ap-south-1 2>/dev/null || true
log "Metric emitted"