# AWS Runbook — BlueGofer Staging + Production

**Last Updated:** 2026-09-18 (Step 15.11)
**Owner:** Development team
**Region:** ap-south-1 (Mumbai)
**AWS Account:** 390630836942

---

## 1. Resource Inventory

| Resource | Identifier | Notes |
|---|---|---|
| EC2 Instance | `i-02e21d2aba38958db` | t3.medium, Amazon Linux 2023 |
| EC2 Elastic IP | `35.154.78.4` | attached |
| EC2 Security Group | `sg-05c743684125c7bdd` | |
| RDS Endpoint | `bluegofer-staging-pg.czg66gs4ukf8.ap-south-1.rds.amazonaws.com:5432` | db.t3.micro, single-AZ |
| RDS Security Group | `sg-06580a0f09d7bf4f2` | |
| Route 53 Zone | `Z0049251104IT8N0VWHA6` | nolimitshopping.com |
| ECR Registry | `390630836942.dkr.ecr.ap-south-1.amazonaws.com` | 3 repos: api, storefront, admin |
| SNS Alert Topic | `arn:aws:sns:ap-south-1:390630836942:bluegofer-staging-alerts` | email: cloud.bluegofer@gmail.com |
| IAM Instance Profile | `bluegofer-staging-ec2-profile` | role: `bluegofer-staging-ec2-role` |

---

## 2. CloudWatch Agent — Setup + Troubleshooting

### 2.1 Install (reference)

```bash
sudo dnf install -y amazon-cloudwatch-agent
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/custom-override.json
sudo systemctl enable --now amazon-cloudwatch-agent
```

### 2.2 Config file locations

- Active config: `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/custom-override.json`
- Merged config: `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.toml`
- Agent logs: `/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log`
- Systemd logs: `journalctl -u amazon-cloudwatch-agent -n 100`

### 2.3 Common diagnostics

```bash
sudo systemctl status amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status
sudo tail -100 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log
```

### 2.4 Known limitations

- `/var/log/secure` — AL2023 uses imjournal, file not present
- `/var/log/messages` — AL2023 uses imjournal, file not present
- `storedBytes: 0` right after stream creation is normal

---

## 3. Log Groups Map

| Group | Source | Retention | Streams |
|---|---|---|---|
| `/bluegofer/staging/system` | CW Agent (files) | 30d | cloud-init, dnf |
| `/bluegofer/staging/nginx` | CW Agent (files) | 30d | access, error |
| `/bluegofer/staging/api` | Docker awslogs | 30d | api |
| `/bluegofer/staging/storefront` | Docker awslogs | 30d | storefront |
| `/bluegofer/staging/admin` | Docker awslogs | 30d | admin |
| `/bluegofer/staging/redis` | Docker awslogs | 30d | redis |

### Log Insights Queries

**API errors (last 1h):**
```
SOURCE '/bluegofer/staging/api'
| fields @timestamp, @message
| filter @message like /(?i)(error|exception|fail)/
| sort @timestamp desc
| limit 50
```

**Nginx 5xx (last 24h):**
```
SOURCE '/bluegofer/staging/nginx'
| fields @timestamp, @message
| filter @message like / 5\d\d /
| stats count() by bin(5m)
```

---

## 4. Alarm Inventory

| Alarm | Metric | Threshold | SNS |
|---|---|---|---|
| `bluegofer-staging-ec2-cpu-high` | AWS/EC2 CPUUtilization | >80% 10m | ✅ |
| `bluegofer-staging-ec2-status-check` | AWS/EC2 StatusCheckFailed | >0 1m | ✅ |
| `bluegofer-staging-ec2-disk-high` | Bluegofer/EC2 DISK_USED_PERCENT | >85% 2m | ✅ |
| `bluegofer-staging-ec2-memory-high` | Bluegofer/EC2 MEM_USED_PERCENT | >85% 2m | ✅ |
| `bluegofer-staging-rds-cpu-high` | AWS/RDS CPUUtilization | >80% 10m | ✅ |
| `bluegofer-staging-rds-storage-low` | AWS/RDS FreeStorageSpace | <2GB | ✅ |

---

## 5. Dashboard

**URL:** https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=BlueGofer-Staging

Widgets: Alarm status, EC2 CPU, EC2 memory, EC2 disk, RDS CPU+storage, API errors, log ingestion.

---

## 6. Terraform State

| Item | Location |
|---|---|
| Backend | S3 |
| Lock | DynamoDB |
| Module root | `infra/terraform/modules/cloudwatch/main.tf` |

**Apply:**
```powershell
cd infra\terraform\environments\staging
terraform plan -out=tfplan
terraform apply tfplan
```

**Import (if drift):**
```powershell
terraform import module.cloudwatch.aws_cloudwatch_metric_alarm.ec2_disk_high bluegofer-staging-ec2-disk-high
terraform import module.cloudwatch.aws_cloudwatch_metric_alarm.ec2_memory_high bluegofer-staging-ec2-memory-high
```

---

## 7. Emergency Procedures

### 7.1 Alarm firing

1. Check dashboard
2. `docker system df` + `docker system prune -af` (disk)
3. `docker stats --no-stream` (memory/CPU)
4. RDS storage → RDS console
5. Status check failed → EC2 console

### 7.2 Disk full on EC2

**Known pattern:** Docker image layers accumulate on every deploy.

**Immediate fix:**
```bash
sudo docker system prune -af --volumes=false
df -h /
```

**Automated:** CI workflow now runs prune before pull (Step 15.11 fix).

### 7.3 Container crash loop

**Symptom:** `docker ps` shows `Restarting`

**Diagnose:**
```bash
sudo docker logs <container> --tail 100 2>&1
```

**Common causes:**
- Missing env var → check `.env` file
- Module not found → check image content: `sudo docker run --rm --entrypoint sh <image> -c "ls -la /app/..."`
- Stale image → force recreate: `sudo docker compose -f docker-compose.prod.yml up -d --force-recreate`

### 7.4 Restore from RDS snapshot

See `docs/dr-runbook.md` (Step 15.13/15.15 deliverable).

---

## 8. Cost Guardrails

| Item | Monthly | Alert |
|---|---|---|
| Total AWS | $47 (locked) | Billing alarm $50 |
| CloudWatch Logs | ~$0.50-1.50 | 5 GB/month |
| CloudWatch Metrics | $0 (agent free tier) | N/A |

**AWS Budgets:** Configured (Step 15.1).
**Cost Explorer:** Tagged `project=bluegofer`, `env=staging`.

---

## 9. Sentry Error Tracking

**URL:** https://bluegofer.sentry.io
**Org:** `bluegofer`
**Email (alerts):** cloud.bluegofer@gmail.com
**Free tier:** 5,000 errors/month, $0 cost

### 9.1 Projects

| Project | Purpose | DSN Environment Var | Region |
|---|---|---|---|
| `bluegofer-api` | NestJS API (backend) | `SENTRY_DSN` (server-side) | de (Germany) |
| `bluegofer-storefront` | Next.js storefront | `NEXT_PUBLIC_SENTRY_DSN` | de |
| `bluegofer-admin` | Next.js admin | `NEXT_PUBLIC_SENTRY_DSN` | de |

### 9.2 Configuration

**API** (`apps/api/.env`):
```
SENTRY_DSN=https://<key>@o4512106159407104.ingest.de.sentry.io/4512106262167632
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=<git-sha>
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Storefront + Admin** (`apps/*/.env.local`):
```
NEXT_PUBLIC_SENTRY_DSN=https://<key>@o4512106159407104.ingest.de.sentry.io/<project-id>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
```

### 9.3 PII Scrubbing

`apps/api/src/common/sentry/pii-scrub.ts` and `packages/config/sentry/pii-scrub.ts`:
- Emails → `[EMAIL]`
- Phone numbers → `[PHONE]`
- Bearer tokens → `Bearer [REDACTED]`
- JWT tokens → `[JWT]`
- Authorization + Cookie headers → deleted
- User IP → `[IP]`

### 9.4 Behavior

- API exception filter: only 5xx captured (4xx = client mistakes)
- Storefront/Admin: client + server errors captured
- Console breadcrumbs: dropped in production
- Trace sample rate: 10% staging, 5% production
- Before DSN set: `[sentry] API: SENTRY_DSN not set — Sentry disabled`

### 9.5 Alerting

- Email: every new issue → cloud.bluegofer@gmail.com
- Alert rules: default "Alert me on every new issue"

### 9.6 Dashboard URLs

- All issues: https://bluegofer.sentry.io/issues/
- API issues: https://bluegofer.sentry.io/issues/?project=4512106262167632
- Storefront issues: https://bluegofer.sentry.io/issues/?project=4512106223042640
- Admin issues: https://bluegofer.sentry.io/issues/?project=4512106268655696

### 9.7 Cost Guardrails

| Item | Free tier | Usage |
|---|---|---|
| Errors/month | 5,000 | ~500-2,000 |
| Performance units | 10,000 | <5,000 |
| Cost | $0 | $0 |

Exceeded: reduce `*_TRACES_SAMPLE_RATE`. Never auto-upgrade to paid.

### 9.8 Diagnostics

```bash
sudo docker logs bluegofer-api 2>&1 | grep -i sentry | head -5

# Working:
# [sentry] API initialized (env=staging, traces=0.1)

# DSN missing:
# [sentry] API: SENTRY_DSN not set — Sentry disabled
```

### 9.9 Known Issue (2026-09-18)

**Issue:** `GET /api/v1/orders/lookup` (without query params) throws `PrismaClientValidationError` → 500 instead of 400.

**Sentry Issue ID:** `BLUEGOFER-API-1`

**Fix:** Add `@Query()` DTO validation in `OrdersController.lookup()`.

**Target:** Step 15.8 (Security sweep).

**Files:**
- `apps/api/src/modules/orders/orders.controller.ts:32`
- `apps/api/src/modules/orders/orders.service.ts:60`

---

## 10. Deployment Workflow (CI/CD)

**Trigger:** Push to `staging` branch → `.github/workflows/deploy-staging.yml`

**Steps:**
1. Build & push 3 Docker images to ECR
2. SSM SendCommand to EC2:
   - `df -h` (disk check)
   - `docker system prune -af` (cleanup)
   - `df -h` (verify freed space)
   - ECR login
   - `docker compose pull`
   - **`docker compose up -d --force-recreate`** (fix: same-tag image swap)
   - `prisma migrate deploy`
   - Status verify
3. Smoke test (curl API health)

**Known gotchas (fixed 2026-09-18):**
- Disk fill from image layers → fixed with prune
- `up -d` doesn't recreate with same `:latest` tag → fixed with `--force-recreate`

---

**End of Runbook**