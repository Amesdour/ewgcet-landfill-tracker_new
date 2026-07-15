---
name: clients.consumed column
description: The clients.consumed DB column is a legacy stale value — never read it directly; always use the live SUM.
---

GET /api/clients recomputes consumed via a subquery:
  `COALESCE((SELECT SUM(d.total) FROM discharges d WHERE pay_method IN ('convention','credit','prepaid') AND status!='cancelled'), 0)`

Incremental writes (`UPDATE clients SET consumed=consumed+$1`) were removed from POST and PUT /api/discharges.
Phase 4 credit-limit server-side checks also use a live SUM query, not the raw column.

**Why:** Incremental writes drifted on cancellations and corrections (no decrement on cancel); the raw column value was never actually used by any read path.
**How to apply:** Never SELECT clients.consumed from DB directly. Always use the live SUM pattern shown above.
