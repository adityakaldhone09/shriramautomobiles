import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db, ensureDbInitialized } from '../../backend/src/db/client';
import { usersTable } from '../../backend/src/db/schema/users';

async function runPhase4Suite() {
  console.log('====================================================');
  console.log('RUNNING PHASE 4: BUSINESS INTELLIGENCE & ANALYTICS');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  await ensureDbInitialized();

  let totalTests = 0;
  let passedTests = 0;

  async function test(name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
      throw err;
    }
  }

  try {
    const timestamp = Date.now();

    // 1. Create Admin User
    const [adminUser] = await db
      .insert(usersTable)
      .values({
        name: 'Executive Director Shriram',
        phone: `98990${String(timestamp).slice(-5)}`,
        email: `director_${timestamp}@shriram.local`,
        passwordHash: hashPassword('DirectorPass123!'),
        role: 'SUPER_ADMIN',
      })
      .returning();
    const adminToken = createToken(adminUser);

    // 2. Create Customer User
    const [customerUser] = await db
      .insert(usersTable)
      .values({
        name: 'Rider Sanjay',
        phone: `98991${String(timestamp).slice(-5)}`,
        email: `sanjay_${timestamp}@shriram.local`,
        passwordHash: hashPassword('CustomerPass123!'),
        role: 'CUSTOMER',
      })
      .returning();
    const customerToken = createToken(customerUser);

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const customerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    };

    // TEST 1: Executive Analytics Summary Metrics
    await test('Executive Analytics Summary returns comprehensive financial & operations data', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics/summary`, { headers: adminHeaders });
      assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.financial, 'Financial metrics must be present');
      assert.ok(typeof body.data.financial.dailySales === 'number', 'dailySales must be a number');
      assert.ok(typeof body.data.financial.monthlyRevenue === 'number', 'monthlyRevenue must be a number');
      assert.ok(typeof body.data.financial.totalRevenueAllTime === 'number', 'totalRevenueAllTime must be a number');
      assert.ok(typeof body.data.financial.outstandingPayments === 'number', 'outstandingPayments must be a number');
      assert.ok(typeof body.data.financial.cgstCollected === 'number', 'cgstCollected must be a number');
      assert.ok(typeof body.data.financial.sgstCollected === 'number', 'sgstCollected must be a number');

      assert.ok(body.data.operations, 'Operations metrics must be present');
      assert.ok(typeof body.data.operations.serviceCompletionRate === 'number', 'serviceCompletionRate must be a number');
      assert.ok(typeof body.data.operations.avgTurnaroundHours === 'number', 'avgTurnaroundHours must be a number');
    });

    // TEST 2: Vehicle Brand Distribution Analysis
    await test('Analytics calculates vehicle brand distribution and service volume percentages', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics/summary`, { headers: adminHeaders });
      const body = await res.json();
      assert.ok(Array.isArray(body.data.brandDistribution), 'brandDistribution must be an array');
      if (body.data.brandDistribution.length > 0) {
        const item = body.data.brandDistribution[0];
        assert.ok(typeof item.brand === 'string');
        assert.ok(typeof item.count === 'number');
        assert.ok(typeof item.percentage === 'number');
      }
    });

    // TEST 3: Inventory Depletion Velocity & Restock Projections
    await test('Analytics calculates inventory depletion velocity and estimated days until stockout', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics/summary`, { headers: adminHeaders });
      const body = await res.json();
      assert.ok(Array.isArray(body.data.inventoryVelocity), 'inventoryVelocity must be an array');
      assert.ok(body.data.inventoryVelocity.length > 0, 'Must contain parts velocity metrics');

      const item = body.data.inventoryVelocity[0];
      assert.ok(typeof item.partId === 'number');
      assert.ok(typeof item.currentStock === 'number');
      assert.ok(typeof item.dailyConsumption === 'number');
      assert.ok(typeof item.daysUntilStockout === 'number');
      assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(item.status));
    });

    // TEST 4: Mechanic Productivity & Efficiency Analytics
    await test('Mechanic productivity tracks assigned jobs, completions, and efficiency rating', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics/summary`, { headers: adminHeaders });
      const body = await res.json();
      assert.ok(Array.isArray(body.data.mechanicProductivity), 'mechanicProductivity must be an array');

      if (body.data.mechanicProductivity.length > 0) {
        const m = body.data.mechanicProductivity[0];
        assert.ok(typeof m.name === 'string');
        assert.ok(typeof m.assignedJobs === 'number');
        assert.ok(typeof m.completedJobs === 'number');
        assert.ok(typeof m.efficiencyPercent === 'number');
      }
    });

    // TEST 5: Monthly Time-Series Trends
    await test('Monthly trends endpoint returns historical timeline for 6 months', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics/trends?months=6`, { headers: adminHeaders });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.equal(body.data.length, 6, 'Must return exactly 6 monthly data points');

      const monthPoint = body.data[0];
      assert.ok(typeof monthPoint.month === 'string');
      assert.ok(typeof monthPoint.revenue === 'number');
      assert.ok(typeof monthPoint.bookings === 'number');
      assert.ok(typeof monthPoint.completed === 'number');
    });

    // TEST 6: Operations & Financial Report CSV Export
    await test('Executive CSV export generates valid CSV report with financial & stock registers', async () => {
      const res = await fetch(`${baseUrl}/admin/analytics/export`, { headers: adminHeaders });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') || '', /text\/csv/);
      assert.match(res.headers.get('content-disposition') || '', /attachment; filename="shriram_automobiles_report_/);

      const csvContent = await res.text();
      assert.match(csvContent, /SHRIRAM AUTOMOBILES - EXECUTIVE OPERATIONS & FINANCIAL REPORT/);
      assert.match(csvContent, /GSTIN,27AABCS1429B1Z8/);
      assert.match(csvContent, /--- EXECUTIVE SUMMARY METRICS ---/);
      assert.match(csvContent, /--- INVOICES REGISTER ---/);
      assert.match(csvContent, /--- SPARE PARTS INVENTORY STATUS ---/);
    });

    // TEST 7: Role Protection on Analytics Endpoints
    await test('Role Protection: Customers strictly prohibited from executive analytics and CSV exports (403)', async () => {
      const resSummary = await fetch(`${baseUrl}/admin/analytics/summary`, { headers: customerHeaders });
      assert.equal(resSummary.status, 403, 'Customer must be blocked from summary');

      const resTrends = await fetch(`${baseUrl}/admin/analytics/trends`, { headers: customerHeaders });
      assert.equal(resTrends.status, 403, 'Customer must be blocked from trends');

      const resExport = await fetch(`${baseUrl}/admin/analytics/export`, { headers: customerHeaders });
      assert.equal(resExport.status, 403, 'Customer must be blocked from export');
    });

    console.log(`\n====================================================`);
    console.log(`ALL ${passedTests}/${totalTests} PHASE 4 TESTS PASSED!`);
    console.log(`====================================================\n`);
  } finally {
    server.close();
  }
}

runPhase4Suite().catch((err) => {
  console.error('\n[FAIL] Phase 4 Test Suite Failed:');
  console.error(err);
  process.exit(1);
});
