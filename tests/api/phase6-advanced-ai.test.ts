/**
 * PHASE 6 INTEGRATION TEST SUITE: ADVANCED AI & COMPUTER VISION
 * Tests Module 6 (Admin AI Assistant with Authenticated DB Tool Calling)
 * and Module 7 (HelmetML Computer Vision & Safety Classifier).
 */

import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db, ensureDbInitialized } from '../../backend/src/db/client';
import { usersTable } from '../../backend/src/db/schema/users';

const server = http.createServer(app);

let port: number;
let baseUrl: string;

let adminToken: string;
let customerToken: string;

async function setup() {
  await ensureDbInitialized();
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  const ts = Date.now();
  // 1. Ensure Admin User
  const [adminUser] = await db
    .insert(usersTable)
    .values({
      name: 'Executive AI Director',
      phone: `98770${String(ts).slice(-5)}`,
      email: `phase6-admin-${ts}@shriram.test`,
      passwordHash: hashPassword('AdminPass123!'),
      role: 'ADMIN',
    })
    .returning();
  adminToken = createToken(adminUser);

  // 2. Ensure Customer User
  const [custUser] = await db
    .insert(usersTable)
    .values({
      name: 'Rider Vishal',
      phone: `98771${String(ts).slice(-5)}`,
      email: `phase6-cust-${ts}@shriram.test`,
      passwordHash: hashPassword('CustPass123!'),
      role: 'CUSTOMER',
    })
    .returning();
  customerToken = createToken(custUser);
}

async function teardown() {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log('\n====================================================');
console.log('RUNNING PHASE 6: ADVANCED AI & COMPUTER VISION TESTS');
console.log('====================================================\n');

setup()
  .then(async () => {
    try {
      const adminHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      };
      const customerHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      };

      // TEST 1: Assistant Tool 1 - Revenue Query
      {
        const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ question: 'How much revenue did we generate this month?' }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.response.includes('Monthly Revenue'));
        assert.ok(json.data.executedTools.some((t: any) => t.toolName === 'getRevenueReport'));
        console.log('  [PASS] Assistant accurately executes getRevenueReport tool for financial questions');
      }

      // TEST 2: Assistant Tool 2 - Low Stock Parts Query
      {
        const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ question: 'Which spare parts are running low on stock?' }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.response.includes('Inventory Alert'));
        assert.ok(json.data.executedTools.some((t: any) => t.toolName === 'getLowStockParts'));
        console.log('  [PASS] Assistant executes getLowStockParts tool for inventory queries');
      }

      // TEST 3: Assistant Tool 3 - Pending Services Query
      {
        const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ question: 'Which services are pending in the workshop?' }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.response.includes('Workshop Service Pipeline'));
        assert.ok(json.data.executedTools.some((t: any) => t.toolName === 'getPendingServices'));
        console.log('  [PASS] Assistant executes getPendingServices tool for operations tracking');
      }

      // TEST 4: Assistant Tool 4 - Mechanic Workload Query
      {
        const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ question: 'Which mechanic has the highest active workload?' }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.response.includes('Mechanic Bay Workload'));
        assert.ok(json.data.executedTools.some((t: any) => t.toolName === 'getMechanicWorkloads'));
        console.log('  [PASS] Assistant executes getMechanicWorkloads tool for technician bay status');
      }

      // TEST 5: Trilingual Capability - Marathi Query for Revenue
      {
        const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ question: 'चालू महिन्याचा एकूण महसूल किती आहे?' }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.response.includes('Monthly Revenue'));
        console.log('  [PASS] Assistant understands Marathi natural language queries and routes correctly');
      }

      // TEST 6: Module 7 - HelmetML Computer Vision Classification
      {
        const res = await fetch(`${baseUrl}/ai/vision/classify-helmet`, {
          method: 'POST',
          headers: customerHeaders,
          body: JSON.stringify({
            vehicleType: 'Motorcycle',
            lightingCondition: 'DAYLIGHT',
          }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.data.detected_helmet, true);
        assert.strictEqual(json.data.helmet_type, 'FULL_FACE');
        assert.strictEqual(json.data.wearing_status, 'CORRECTLY_WORN');
        assert.strictEqual(json.data.safety_compliance.isi_certified, true);
        assert.ok(json.data.suggested_catalog_helmets.length > 0);
        assert.ok(json.data.dataset_attribution.includes('HelmetML'));
        console.log('  [PASS] Module 7: HelmetML computer vision accurately classifies helmet type and safety compliance');
      }

      // TEST 7: Role Isolation - Customers Strictly Forbidden from Admin Assistant
      {
        const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
          method: 'POST',
          headers: customerHeaders,
          body: JSON.stringify({ question: 'Show me total revenue' }),
        });
        assert.strictEqual(res.status, 403);

        const unauthRes = await fetch(`${baseUrl}/ai/assistant/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'Show me total revenue' }),
        });
        assert.strictEqual(unauthRes.status, 401);

        console.log('  [PASS] Role Protection: Customers strictly blocked from Admin Assistant function calling (403)');
      }

      console.log('\n====================================================');
      console.log('ALL 7/7 PHASE 6 ADVANCED AI TESTS PASSED!');
      console.log('====================================================\n');

      await teardown();
      process.exit(0);
    } catch (err) {
      console.error('\n[FAIL] Phase 6 Test Failed:', err);
      await teardown();
      process.exit(1);
    }
  })
  .catch(async (err) => {
    console.error('Phase 6 setup error:', err);
    await teardown();
    process.exit(1);
  });
