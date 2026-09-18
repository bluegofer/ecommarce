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