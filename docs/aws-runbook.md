
```markdown
# AWS Runbook — BlueGofer Staging + Production

**Last Updated:** 2026-09-18 (Step 15.7)
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

### 2.1 Install (already done, for reference)

```bash
sudo dnf install -y amazon-cloudwatch-agent
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d
# write config to amazon-cloudwatch-agent.d/custom-override.json
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/custom-override.json
sudo systemctl enable --now amazon-cloudwatch-agent
```

### 2.2 Config file locations

- **Active config:** `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/custom-override.json`
- **Merged config (auto-generated):** `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.toml`
- **Agent logs:** `/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log`
- **Systemd logs:** `journalctl -u amazon-cloudwatch-agent -n 100`

### 2.3 Common diagnostics

```bash
# Check service
sudo systemctl status amazon-cloudwatch-agent

# Agent self-status (JSON)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status

# Tail agent log
sudo tail -100 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log

# Verify a metric reached AWS (from PowerShell)
aws cloudwatch list-metrics --namespace "Bluegofer/EC2" --query "Metrics[*].MetricName" --output text
```

### 2.4 Known limitations

- `/var/log/secure` — AL2023 uses `imjournal`, file not present; CW Agent skips it
- `/var/log/messages` — AL2023 uses `imjournal`, file not present
- `storedBytes: 0` right after stream creation is normal (Docker flushes every 5s)

---

## 3. Log Groups Map

| Group | Source | Retention | Streams |
|---|---|---|---|
| `/bluegofer/staging/system` | CW Agent (files) | 30d | `{instance_id}/cloud-init`, `{instance_id}/dnf` |
| `/bluegofer/staging/nginx` | CW Agent (files) | 30d | `{instance_id}/access`, `{instance_id}/error` |
| `/bluegofer/staging/api` | Docker `awslogs` | 30d | `api` |
| `/bluegofer/staging/storefront` | Docker `awslogs` | 30d | `storefront` |
| `/bluegofer/staging/admin` | Docker `awslogs` | 30d | `admin` |
| `/bluegofer/staging/redis` | Docker `awslogs` | 30d | `redis` |

### Log Insights — useful queries

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

**Slow storefront requests:**
```
SOURCE '/bluegofer/staging/storefront'
| fields @timestamp, @message
| parse @message /(?<duration>\d+)ms/
| filter duration > 1000
| sort duration desc
| limit 100
```

---

## 4. Alarm Inventory

| Alarm | Metric | Threshold | SNS |
|---|---|---|---|
| `bluegofer-staging-ec2-cpu-high` | AWS/EC2 CPUUtilization | >80% for 10m | ✅ |
| `bluegofer-staging-ec2-status-check` | AWS/EC2 StatusCheckFailed | >0 for 1m | ✅ |
| `bluegofer-staging-ec2-disk-high` | Bluegofer/EC2 DISK_USED_PERCENT | >85% for 2m | ✅ |
| `bluegofer-staging-ec2-memory-high` | Bluegofer/EC2 MEM_USED_PERCENT | >85% for 2m | ✅ |
| `bluegofer-staging-rds-cpu-high` | AWS/RDS CPUUtilization | >80% for 10m | ✅ |
| `bluegofer-staging-rds-storage-low` | AWS/RDS FreeStorageSpace | <2GB | ✅ |

**Total:** 6 alarms → all wire to `bluegofer-staging-alerts` SNS topic → email `cloud.bluegofer@gmail.com`

---

## 5. Dashboard

**URL:** https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=BlueGofer-Staging

**Widgets:**
1. Alarm Status (all 6)
2. EC2 CPU Idle %
3. EC2 Memory %
4. EC2 Disk %
5. RDS CPU + Free Storage (dual-axis)
6. API container recent errors (log insights)
7. Log ingestion — IncomingBytes across all staging groups

---

## 6. Terraform State

| Item | Location |
|---|---|
| Backend | S3 (bucket in `infra/terraform/environments/staging/backend.tf`) |
| Lock | DynamoDB |
| Module root | `infra/terraform/modules/cloudwatch/main.tf` (alarms + SNS) |

**Apply workflow:**
```powershell
cd infra\terraform\environments\staging
terraform plan -out=tfplan
terraform apply tfplan
```

**Note:** The 2 new alarms (disk-high, memory-high) were created via AWS CLI on 2026-09-18 for immediate effect. Terraform mirror added same day. If `terraform plan` shows drift, use `terraform import`:

```powershell
terraform import module.cloudwatch.aws_cloudwatch_metric_alarm.ec2_disk_high bluegofer-staging-ec2-disk-high
terraform import module.cloudwatch.aws_cloudwatch_metric_alarm.ec2_memory_high bluegofer-staging-ec2-memory-high
```

---

## 7. Emergency Procedures

### 7.1 Alarm firing — what to do

1. Check dashboard: https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=BlueGofer-Staging
2. For disk-high: `docker system df` (SSM shell) → prune if needed
3. For memory-high: `docker stats --no-stream` → identify hot container
4. For CPU-high: `docker stats` + `htop` → identify workload
5. For RDS storage-low: check S3/media growth, consider RDS storage extension
6. For status-check failed: EC2 console → instance → Status Checks tab

### 7.2 Log group growth runaway

If `/bluegofer/staging/*` groups exceed expected volume:
```powershell
aws logs describe-log-groups --log-group-name-prefix "/bluegofer/staging" --query "logGroups[*].[logGroupName,storedBytes]" --output table
```
High-volume source suspected → check app log level (should be INFO/ERROR only).

### 7.3 Restore from RDS snapshot

See `docs/dr-runbook.md` (Step 15.13/15.15 deliverable).

---

## 8. Cost Guardrails

| Item | Monthly budget | Alert threshold |
|---|---|---|
| Total AWS | $47 (locked, TDD Appendix B) | Billing alarm at $50 |
| CloudWatch Logs | ~$0.50-1.50 | Ingestion volume alarm at 5 GB/month |
| CloudWatch Metrics | $0 (CW Agent free tier) | N/A |

**AWS Budgets:** Configured (Step 15.1).
**Cost Explorer:** Tagged by `project=bluegofer`, `env=staging`.
```

---


---
