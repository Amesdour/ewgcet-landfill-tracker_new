---
name: PUT discharge null-safe fix
description: PUT /api/discharges/:id must never null columns when a partial payload is sent.
---

The full-overwrite branch fetches the existing row with FOR UPDATE, then uses `??` fallback for every field:
  `const truck = d.truck ?? oldD.truck;` // etc. for all columns

Status-only changes must send `{ statusOnly: true }` from the frontend — this hits the safe branch and skips the full overwrite entirely.

**Why:** The "Régulariser" action was sending `{status:"settled"}` without `statusOnly`, falling into the full-overwrite branch and writing `undefined` into every column.
**How to apply:** Any new frontend code that sends a status-only PUT to /api/discharges/:id must include `statusOnly: true` in the body.
