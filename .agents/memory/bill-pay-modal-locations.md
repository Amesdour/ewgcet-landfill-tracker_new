---
name: Bill-payment modal locations
description: Where the 💰 Régler Facture button and openBillPayModal are wired in the frontend
---

The "Régler Facture" button triggers openBillPayModal(cl/c) and is placed in two spots:
1. **Vue Mensuelle** (PageInvoice global table ~line 5925): unconditional, but only renders for rows in globalRows — clients with discharges in the selected month.
2. **Relevé Client** (PageInvoice client detail action bar ~line 6444): conditional on c being a convention/prepaid/rotation client; always visible when a client is selected and their type matches.

The button is NOT on the Clients page (PageClients) — only in PageInvoice.

**Why:** The modal requires a bill (fetched or generated via POST /api/bills) — it only makes sense for billable clients with the billing system.

**How to apply:** If the user can't see the button, check they are in Facturation tab → Relevé Client with a convention/rotation/prepaid client selected.
