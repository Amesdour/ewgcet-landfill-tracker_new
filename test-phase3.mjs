/**
 * Phase 3.5 — Automated validation test for the FIFO billing engine.
 * Run with: node test-phase3.mjs
 *
 * Scenario: 7 discharges for one test client, vatSubject = false (HT = TTC).
 * Verifies Step A (bill generation), Step B (payment + FIFO allocation), Step C (next bill).
 */

const BASE = 'http://localhost:3001';
const CLIENT_ID = 'TP3TEST'; // ≤10 chars (clients.id is VARCHAR(10))

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${JSON.stringify(json)}`);
  return json;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✅ ${msg}`);
}

function approxEq(a, b, msg, tol = 0.01) {
  assert(Math.abs(a - b) <= tol, `${msg} — expected ${b}, got ${a}`);
}

// ── Setup: insert test client and test discharges via the API ─────────────────

async function setup() {
  console.log('\n── Setup: creating test client and discharges ──────────────────');

  // Create test client (vatSubject=false, convention type)
  await fetch(`${BASE}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: CLIENT_ID,
      name: 'Test Phase 3 Client',
      clientType: 'state',
      type: 'convention',
      status: 'approved',
      creditEnabled: false,
      weightLimitYear: 0,
      creditLimit: 0,
      payFrequency: 'monthly',
      payInstrument: 'cheque',
      phone: '', address: '', nif: '', rc: '', docs: [], note: '',
      vatSubject: false,
      assignedSites: [],
      serviceType: 'treatment_only',
      collectBillingMode: 'tonnage',
      allowedWasteTypes: [],
    }),
  });

  const now = new Date().toISOString();

  // d1–d3: insert first so they are the only ones available for Step A
  const batch1 = [
    { id: 'TD-PH3-001', wasteType: 'INE', net: 8,  unitPrice: 650, total: 5200, note: 'd1 Inerte 8t' },
    { id: 'TD-PH3-002', wasteType: 'MEN', net: 6,  unitPrice: 850, total: 5100, note: 'd2 Ménager 6t' },
    { id: 'TD-PH3-003', wasteType: 'MEN', net: 9,  unitPrice: 850, total: 7650, note: 'd3 Ménager 9t' },
  ];

  for (const d of batch1) {
    // Insert directly via DB-style POST to bypass ts sanity check (use past date so order is correct)
    await fetch(`${BASE}/api/discharges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: d.id,
        ts: new Date(Date.now() - 3600_000).toISOString(), // 1h ago (within 24h window)
        siteId: 'CET-JIJ',
        clientId: CLIENT_ID,
        clientName: 'Test Phase 3 Client',
        truck: 'TEST-TRUCK',
        wasteType: d.wasteType,
        gross: d.net + 10,
        tare: 10,
        net: d.net,
        unitPrice: d.unitPrice,
        total: d.total,
        status: 'settled',
        payMethod: 'convention',
        opId: null,
        opType: 'treatment',
      }),
    });
  }
  console.log('  Inserted d1, d2, d3');
  return batch1;
}

async function insertBatch2() {
  const batch2 = [
    { id: 'TD-PH3-004', wasteType: 'INE', net: 7,  unitPrice: 650, total: 4550, note: 'd4 Inerte 7t' },
    { id: 'TD-PH3-005', wasteType: 'INE', net: 10, unitPrice: 650, total: 6500, note: 'd5 Inerte 10t' },
    { id: 'TD-PH3-006', wasteType: 'INE', net: 3,  unitPrice: 650, total: 1950, note: 'd6 Inerte 3t' },
    { id: 'TD-PH3-007', wasteType: 'MEN', net: 4,  unitPrice: 850, total: 3400, note: 'd7 Ménager 4t' },
  ];
  for (const d of batch2) {
    await fetch(`${BASE}/api/discharges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: d.id,
        ts: new Date(Date.now() - 1800_000).toISOString(),
        siteId: 'CET-JIJ',
        clientId: CLIENT_ID,
        clientName: 'Test Phase 3 Client',
        truck: 'TEST-TRUCK',
        wasteType: d.wasteType,
        gross: d.net + 10, tare: 10, net: d.net,
        unitPrice: d.unitPrice, total: d.total,
        status: 'settled', payMethod: 'convention',
        opId: null, opType: 'treatment',
      }),
    });
  }
  console.log('  Inserted d4, d5, d6, d7');
  return batch2;
}

async function cleanup() {
  console.log('\n── Cleanup ──────────────────────────────────────────────────────');
  // The test data will remain in DB — clean up via DB directly if needed.
  // For now just note the IDs used.
  console.log('  Test data IDs: client='+CLIENT_ID+', discharges=TD-PH3-001..007');
  console.log('  To clean up: DELETE FROM discharges WHERE id LIKE \'TD-PH3-%\'; then DELETE client.');
}

// ── Main test ─────────────────────────────────────────────────────────────────

(async () => {
  try {
    await setup();

    // ── Step A: generate bill for d1, d2, d3 only ────────────────────────────
    console.log('\n── Step A: generate bill (should scope to d1+d2+d3 only) ──────');
    const billA = await api('POST', '/api/bills', { clientId: CLIENT_ID });
    console.log('  Bill A:', billA.id, 'total_ttc:', billA.totalTTC);
    approxEq(billA.totalTTC, 17950, 'Bill A total_ttc = 17,950 DA');
    assert(billA.discharges.length === 3, 'Bill A scopes exactly 3 discharges');
    const billAIds = billA.discharges.map(d => d.id).sort();
    assert(
      JSON.stringify(billAIds) === JSON.stringify(['TD-PH3-001','TD-PH3-002','TD-PH3-003'].sort()),
      'Bill A contains exactly d1, d2, d3'
    );

    // ── Insert d4–d7 AFTER bill A is generated ───────────────────────────────
    await insertBatch2();

    // ── Step B: apply 12,000 DA payment to bill A ────────────────────────────
    console.log('\n── Step B: apply 12,000 DA payment ─────────────────────────────');
    const payResult = await api('POST', `/api/bills/${billA.id}/payments`, {
      amountTTC: 12000,
      method: 'cheque',
      note: 'Phase 3.5 test payment',
    });
    console.log('  appliedAmount:', payResult.appliedAmount, 'unapplied:', payResult.unappliedAmount);
    approxEq(payResult.appliedAmount,   12000, 'Applied amount = 12,000 DA');
    approxEq(payResult.unappliedAmount, 0,     'No unapplied amount (payment < total)');
    assert(payResult.billStatus === 'partial', 'Bill A is now partial (5,950 still owed)');

    // Check individual allocations
    const alloc = payResult.allocations;
    const d1alloc = alloc.find(a => a.discharge_id === 'TD-PH3-001');
    const d2alloc = alloc.find(a => a.discharge_id === 'TD-PH3-002');
    const d3alloc = alloc.find(a => a.discharge_id === 'TD-PH3-003');
    assert(d1alloc, 'd1 has an allocation');
    assert(d2alloc, 'd2 has an allocation');
    assert(d3alloc, 'd3 has an allocation');
    approxEq(d1alloc.appliedTTC, 5200, 'd1 fully paid (5,200 DA)');
    approxEq(d2alloc.appliedTTC, 5100, 'd2 fully paid (5,100 DA)');
    approxEq(d3alloc.appliedTTC, 1700, 'd3 partially paid (1,700 DA)');

    // Verify receipt lines
    const receipt = payResult.receiptLines;
    console.log('  Receipt lines:', JSON.stringify(receipt, null, 2));
    const inerteLine = receipt.find(l => l.wasteType === 'INE');
    const menagerLine = receipt.find(l => l.wasteType === 'MEN');
    assert(inerteLine,  'Receipt has Inerte line');
    assert(menagerLine, 'Receipt has Ménager line');
    approxEq(inerteLine.qty,       8, 'Inerte: 8t');
    approxEq(inerteLine.montantHT, 5200, 'Inerte: 5,200 DA');
    approxEq(menagerLine.qty,      8, 'Ménager: 8t (6 from d2 + 2 from d3)');
    approxEq(menagerLine.montantHT, 6800, 'Ménager: 6,800 DA');
    const receiptTotal = receipt.reduce((s, l) => s + l.montantTTC, 0);
    approxEq(receiptTotal, 12000, 'Receipt total = 12,000 DA ✅');

    // ── Step C: generate next bill for this client ────────────────────────────
    console.log('\n── Step C: generate next bill (d3 remaining + d4–d7) ───────────');
    const billB = await api('POST', '/api/bills', { clientId: CLIENT_ID });
    console.log('  Bill B:', billB.id, 'total_ttc:', billB.totalTTC);
    approxEq(billB.totalTTC, 22350, 'Bill B total_ttc = 22,350 DA (= 34,350 − 12,000)');
    assert(billB.discharges.length === 5, 'Bill B scopes 5 entries: d3-remaining + d4 + d5 + d6 + d7');
    const billBIds = billB.discharges.map(d => d.id).sort();
    const expectedBIds = ['TD-PH3-003','TD-PH3-004','TD-PH3-005','TD-PH3-006','TD-PH3-007'].sort();
    assert(JSON.stringify(billBIds) === JSON.stringify(expectedBIds),
      'Bill B contains d3, d4, d5, d6, d7');

    console.log('\n🎉 ALL PHASE 3.5 ASSERTIONS PASSED');
    await cleanup();
  } catch(err) {
    console.error('\n❌ TEST FAILED:', err.message);
    await cleanup();
    process.exit(1);
  }
})();
