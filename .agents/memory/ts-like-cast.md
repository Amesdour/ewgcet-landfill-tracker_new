---
name: ts LIKE SQL cast fix
description: PostgreSQL LIKE operator does not work on timestamp columns; must cast to text
---

The `ts` column on the `discharges` table is `timestamp without time zone`.
PostgreSQL does not allow `ts LIKE $2` (operator does not exist: timestamp without time zone ~~ unknown).

**Fix:** Always cast before LIKE: `ts::text LIKE $2`

**Why:** The LIKE operator is string-only in PostgreSQL; implicit casts from timestamp to text are not available for operator lookup.

**How to apply:** Any query that prefix-matches a timestamp column (e.g. for monthly/annual period matching) must use `col::text LIKE 'YYYY-MM%'`.
