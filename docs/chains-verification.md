# A.5 Cross-Module Chain Verification

**Date:** 2026-09-26
**Status:** COMPLETE - all four chains proven end-to-end (integration tests, real Postgres)
**TDD Reference:** Appendix A section A.5
**Session:** B (steps 49-50)

---

## Summary

TDD A.5 mandates four automation chains be closed end-to-end. This document records
the proof, the test spec that exercises each chain, and any known gaps.

| # | Chain | Test Spec | Result | Steps |
|---|---|---|---|---|
| 1 | POS -> Inventory -> Accounting | `apps/api/test/pos/pos.integration.spec.ts` | PASS | pre-existing |
| 2 | Purchase -> Inventory -> Supplier Accounts | `apps/api/test/purchase/grn.integration.spec.ts` | PASS | pre-existing |
| 3 | HR -> Attendance -> Payroll -> Accounts | `apps/api/test/hr/payroll.integration.spec.ts` | PASS | pre-existing |
| 4 | Website Orders -> Inventory -> Accounting | `apps/api/test/chains/chain-4-orders-accounting.spec.ts` | PASS | NEW (step-50) |

**Test run evidence:** `Test Suites: 4 passed, 4 total / Tests: 17 passed, 17 total` (25.968 s, real Postgres).

---

## Chain 4 - What Was Actually Wrong (and what got fixed)

### Symptom (Phase 4 audit)
> 11 orders, 0 journal entries from website orders.

### Root Cause
The revenue-posting hook existed (`OrdersService.postRevenueOnDelivery`) but only
fired when an order reached `DELIVERED`. In practice:

1. **No order had ever reached DELIVERED** on staging - all 11 stuck at PLACED.
2. **Prepaid methods (bKSh/Nagad/SSLCommerz) had no revenue hook at all** -
   only a stale comment in `payments.service.ts:125` referencing "13.3" (a step
   that shipped without the hook).

For COD, the design (post at DELIVERED) was correct. For prepaid, TDD section 6.8
mandates revenue at **payment confirmation** (before delivery).

### Fix (step-49 + step-50)
- Added `PaymentsService.postRevenueOnPaid(orderId)` - mirrors the delivery hook,
  idempotent via `(sourceType=ORDER, sourceId=orderId)`.
- Wired it into `applyWebhook` after the PAID status flip, only for non-COD methods.
- Fixed the missing import (`AccountingModule` now provides `LedgerService` to
  `PaymentsModule`).
- Fixed a partial-application bug in step-49: the new method was added but the
  call site inside `applyWebhook` was not (multi-line PowerShell replace failed
  silently due to EOL mismatch). step-50 corrected both the call site and the
  test.

### Test coverage (chain-4-orders-accounting.spec.ts)
1. **COD: revenue posted when order transitions to DELIVERED**
   - Full legal chain: PLACED -> PENDING_VERIFICATION -> VERIFIED -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
   - Asserts: 1 journal entry, 2 balanced lines, debit = credit = order total.
2. **Prepaid (bKSh): revenue posted on webhook PAID - before delivery**
   - Asserts: journal appears immediately after `applyWebhook(PAID)`, no delivery required.
3. **Idempotency: duplicate webhook does not double-post**
   - Same event applied twice -> still 1 journal entry.
4. **Idempotency: paid then delivered - one journal total**
   - Webhook PAID posts; subsequent DELIVERED transition skips the post (existing entry detected).

---

## How to Run

```bash
cd apps/api
pnpm test -- test/pos test/purchase test/hr test/chains --verbose
```

Expected: 17 passed, 4 suites.

---

## Known Gaps (still open, tracked elsewhere)

| Gap | Owner | Where tracked |
|---|---|---|
| Courier settlement reconciliation count (dashboard) | dev | Custom Phase 7 |
| Refund -> ledger reversal hook | dev | TBD - currently refunds update payment row but do not post a reversing entry |
| Prepaid order that FAILS after PAID (refund flow timing) | dev | TBD |

None of these block Step 16 UAT - they are additive.

---

## References
- TDD v2.1 - Appendix A section A.5
- `apps/api/test/accounting/ledger.integration.spec.ts` - ledger invariants
- `apps/api/test/chains/chain-4-orders-accounting.spec.ts` - this chain's full e2e
- Commits: `step-49`, `step-50`
