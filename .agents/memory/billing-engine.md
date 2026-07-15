---
name: Billing engine design
description: How bills, payments, and discharge remaining balances work in the new billing system.
---

A discharge's remaining balance is computed live: `total_ttc - COALESCE(SUM(applied_amount_ttc FROM discharge_payments), 0)`.

Bill generation (POST /api/bills) picks up discharges NOT in an OPEN bill (NOT EXISTS where b.status='open'). Partial bills allow their discharges to carry forward to the next bill — this is intentional (Phase 3.4 design).

FIFO waterfall: work in integer centimes (`Math.round(amountTTC * 100)`), iterate discharges ordered by `ts ASC, id ASC`.

Receipt grouped by `(waste_type, unit_price)` — separate sub-lines for mixed tariffs within the same waste type.

**Why:** Live computation avoids drift; partial-bill carry-forward means the NOT EXISTS check must only block 'open' bills, not 'partial' ones — if you block both, partially-paid discharges never appear in the next bill.
**How to apply:** Bill IDs use base36 timestamp (`BL-xxx`) to fit VARCHAR(30). Payment IDs use `PY-xxx`. clients.id is VARCHAR(10) — test client IDs must be ≤10 chars.
