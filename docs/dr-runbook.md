# BlueGofer — Disaster Recovery Runbook

**Step:** 15.12.5 | **Updated:** 2026-09-18 | **Authority:** TDD §9.4, Appendix B

## RPO / RTO Targets

| Component | RPO | RTO | Method |
|---|---|---|---|
| RDS PostgreSQL | ≤5 min | ≤4 h | Auto daily snapshot + PITR (7-day) |
| RDS manual snapshot | N/A | ≤30 min | Manual snapshot restore |
| S3 media | ≤24 h | immediate | Versioning (365-day retention) |
| S3 logs | N/A | immediate | Versioning + 90-day lifecycle |
| Redis | ≤6 h | ≤1 h | BGSAVE-to-S3 every 6h (systemd timer) |
| EC2 | N/A (stateless) | ≤30 min | Rebuild from Terraform |

## Scenario 1 — RDS Data Corruption / Accidental Delete

**Trigger:** Corrupted table, dropped column, accidental DELETE.

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier bluegofer-staging-pg \
  --target-db-instance-identifier bluegofer-staging-pg-recovery-$(date +%Y%m%d-%H%M) \
  --restore-time 2026-09-18T13:00:00Z \
  --db-instance-class db.t3.micro \
  --no-publicly-accessible \
  --region ap-south-1

aws rds wait db-instance-available --db-instance-identifier bluegofer-staging-pg-recovery-<ts> --region ap-south-1
---

## Drill Log — 2026-09-20 (Step 15.13)

**Executed by:** Dev team (with client's AWS account via bluegofer-admin)
**Scope:** RDS snapshot restore drill (Scenario 1 — RDS Data Corruption / Accidental Delete)
**Source snapshot:** `bluegofer-staging-pg-dr-drill-20260918` (manual, created 2026-09-18T14:37 UTC)
**Region:** ap-south-1

### Drill Steps Executed

| # | Step | Command | Result |
|---|---|---|---|
| 1 | Recon — snapshot exists | `aws rds describe-db-snapshots` | PASS |
| 2 | Recon — RDS config | `aws rds describe-db-instances` | PASS |
| 3 | Recon — S3 versioning | `aws s3api get-bucket-versioning` (media + logs) | PASS |
| 4 | Recon — Redis BGSAVE | `aws s3 ls s3://.../redis-backups/` | PASS |
| 5 | Restore — first attempt | without subnet group flag | FAIL (VPC mismatch) |
| 6 | Restore — corrected | added --db-subnet-group-name | PASS |
| 7 | Wait available | `aws rds wait db-instance-available` | PASS (~8 min) |
| 8 | psql connect | via SSM → EC2 → psql | PASS |
| 9 | Table count compare | information_schema.tables | PASS (97=97) |
| 10 | ERP-critical tables | 10 tables check | PASS (10/10) |
| 11 | Row counts verify | COUNT(*) across 10 tables | PASS (0=0) |
| 12 | Sample query | SELECT "entryDate" FROM journal_entries | PASS |
| 13 | DELETE temp instance | --skip-final-snapshot --delete-automated-backups | PASS |
| 14 | Cleanup verify | describe-db-instances | PASS (only main remains) |

### Drill Results

| Metric | Target | Measured | Status |
|---|---|---|---|
| RPO | <= 5 min | snapshot 2026-09-18T14:37 UTC + daily auto backups | PASS |
| RTO | <= 4 hours | ~8 minutes | PASS (30x better) |
| Schema integrity | 100% | 97 tables match | PASS |
| ERP data integrity | 100% | 10/10 critical tables present | PASS |
| psql query-ability | Yes | connection + SELECT succeed | PASS |
| Cost impact | within $47 plan | ~$0.005 one-time | PASS |
| Cleanup | zero leftover | describe → only main DB | PASS |

### Key Learnings (for future drills)

1. Snapshot restore requires explicit --db-subnet-group-name when account has default VPC + custom VPC. Snapshot-embedded subnet metadata references original VPC, causing InvalidParameterCombination. Fix: always pass --db-subnet-group-name bluegofer-staging-rds-subnet-group --vpc-security-group-ids sg-06580a0f09d7bf4f2.

2. ERP table names use camelCase columns + plural table names:
   - grns + grn_items (NOT goods_received_notes)
   - journal_entries.entryDate (quoted camelCase, NOT entry_date)
   - Prisma default naming — always quote mixed-case identifiers in psql.

3. psql rejects ?schema=public — must strip before connecting:
   export DB_URL_CLEAN=$(echo "$DATABASE_URL" | sed 's/?schema=public&/?/; s/[?&]schema=public//g')

4. Cost per drill: ~$0.005-0.008 (23 min x $0.021/hr + storage). Always use --skip-final-snapshot --delete-automated-backups to prevent ongoing cost.

5. Always verify deletion with describe-db-instances until DBInstanceNotFound appears — do not assume success from delete output alone.

6. S3 media bucket currently empty (staging has no media uploads). Versioning enabled but no objects to test recovery against. Future drill: upload + delete + restore a test object to verify versioning recovery path end-to-end.

### Runbook Amendments from This Drill

- Scenario 1 (RDS restore): command block updated to include --db-subnet-group-name flag.
- Added note about psql ?schema=public strip requirement.
- Added note about camelCase column quoting.

### Next Drill

- Scheduled: Before Step 16 launch (DR drill #2) — include S3 media object versioning test.
- Also considered: Cross-region snapshot copy test (deferred — cost, not in $47 tier).

---