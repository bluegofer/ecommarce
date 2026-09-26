# BlueGofer — Load Test Report (Step 15.10)

**Date:** 2026-09-20
**Target:** Staging (`api.nolimitshopping.com`)
**TDD reference:** §11.1 (concurrency/oversell), §13.2 (load testing), Appendix B (capacity targets)
**Workflow reference:** Step 15 §110 (Load test)
**Tool:** k6 v2.2.0 (Grafana)
**Scope:** 4 scenarios — smoke, browse, flash-sale oversell, mixed traffic
**Status:** ✅ PASSED — zero oversell under 100 concurrent VUs; p95 within budget

---

## 1. Environment Under Test

| Component | Spec |
|---|---|
| API | NestJS + Prisma + PostgreSQL |
| Host | EC2 t3.medium (2 vCPU, 4 GB RAM), 4 containers (api/storefront/admin/redis) |
| Database | RDS PostgreSQL db.t3.micro, single-AZ |
| Cache | Self-hosted Redis (in-EC2) |
| Reverse proxy | Nginx (systemd) |
| Deployment | Docker Compose, ECR images, `--force-recreate` on each deploy |
| Tier | "Client-Starter" @ ~$47/month (Appendix B) |

**Test client:** Windows 10 laptop → internet → Cloudflare DNS → Route 53 → EC2 nginx → API container (no CDN path for API traffic).

**Special provision:** `LOAD_TEST_IP=<my-public-ip>` env var on the API container bypasses per-IP rate limiting for load tests. Applied only for this session, removed afterward.

---

## 2. Scenarios & Results

### 2.1 Smoke (sanity check)

| Setting | Value |
|---|---|
| VUs | 1 |
| Duration | 10s |
| Purpose | Verify k6 + API connectivity |

**Results:**
- Requests: 6
- Failed rate: 0%
- p95: 428ms
- `browse_success_rate`: 1.0
- `oversell_events`: 0

✅ Passed.

---

### 2.2 Browse (50 concurrent)

| Setting | Value |
|---|---|
| VUs | 50 |
| Duration | 2 min |
| Flow | `GET /cms/home-feed` → `GET /search/suggestions` → `GET /search/products?pageSize=24` |

**Results:**
- Requests: 4,239
- **Failed rate: 0%**
- **p95: 306ms** (target < 500ms)
- **`browse_success_rate`: 1.0**
- `oversell_events`: 0

✅ Passed. **50 concurrent users sustained comfortably.**

---

### 2.3 Flash-sale oversell test (TDD §11.1) — THE CRITICAL TEST

| Setting | Value |
|---|---|
| VUs | 100 |
| Duration | 30s |
| Target | Single variant `FLASH-SALE-5UNITS`, stock = 5 |
| Purpose | Prove conditional stock decrement prevents oversell |

**Results:**
- Requests: ~4,376
- Failed rate: 49.9% (clean 409/400 rejections — insufficient stock)
- **`order_success_rate`: 0.229%** (≈ exactly 5 orders succeeded, matching stock)
- **`oversell_events`: 0** ← ← ← **TDD §11.1 PROVEN**
- p95: 886ms (expected degradation at 100 VUs on t3.medium — see Appendix B §B.4 "Stretch 50, degraded 70-100")

**Final stock check (PostgreSQL query after test):**