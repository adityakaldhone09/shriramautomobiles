/**
 * PHASE 5 INTEGRATION TEST SUITE: AI INTELLIGENCE MICROSERVICE & AUTOMOTIVE PREDICTIVE ENGINES
 * Tests Modules 1-5: Maintenance, Verified Parts Compatibility, Predictive Wear, Inventory Demand Forecasting, Customer Intelligence, and RBAC isolation.
 */

import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db, ensureDbInitialized } from '../../backend/src/db/client';
import { usersTable } from '../../backend/src/db/schema/users';
import { eq } from 'drizzle-orm';

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

  // 1. Ensure Admin User
  const ts = Date.now();
  const adminEmail = `phase5-admin-${ts}@shriram.test`;
  const [adminUser] = await db
    .insert(usersTable)
    .values({
      name: 'AI Admin Officer',
      phone: `98880${String(ts).slice(-5)}`,
      email: adminEmail,
      passwordHash: hashPassword('AdminPass123!'),
      role: 'ADMIN',
    })
    .returning();
  adminToken = createToken(adminUser);

  // 2. Ensure Customer User
  const customerEmail = `phase5-cust-${ts}@shriram.test`;
  const [custUser] = await db
    .insert(usersTable)
    .values({
      name: 'AI Customer User',
      phone: `98881${String(ts).slice(-5)}`,
      email: customerEmail,
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
console.log('RUNNING PHASE 5: AI INTELLIGENCE MICROSERVICE TESTS');
console.log('====================================================\n');

setup()
  .then(async () => {
    try {
      // TEST 1: Diagnostic Health Endpoint
      {
        const res = await fetch(`${baseUrl}/ai/health`);
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.modules.length >= 5);
        console.log('  [PASS] Diagnostic AI health endpoint operational with 5 active intelligence modules');
      }

      // TEST 2: Module 1 - Vehicle Maintenance Recommendation
      {
        const res = await fetch(`${baseUrl}/ai/recommend/maintenance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
          body: JSON.stringify({
            brand: 'Hero',
            model: 'Splendor Plus',
            mileage: 12500,
            customerReportedProblem: 'Brake lever feels loose and front brake screeching',
          }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.data.brand, 'Hero');
        assert.strictEqual(json.data.maintenance_priority, 'URGENT');
        assert.ok(json.data.relevant_service_categories.includes('BRAKE_SERVICE'));
        assert.ok(json.data.recommended_inspections.length > 0);
        assert.ok(json.data.possible_replacements.length > 0);
        assert.ok(json.data.disclaimer.includes('physically verified'));
        console.log('  [PASS] Module 1: Vehicle Maintenance Recommendation correctly analyzes mileage intervals and symptoms');
      }

      // TEST 3: Module 2 - AI Spare-Part Recommendation with Verified Compatibility
      {
        const res = await fetch(`${baseUrl}/ai/recommend/parts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
          body: JSON.stringify({
            modelSlug: 'honda-activa-110',
            serviceCategory: 'OIL_CHANGE',
          }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.data.model_slug, 'honda-activa-110');
        assert.ok(json.data.total_recommendations >= 1);
        for (const p of json.data.recommended_parts) {
          assert.strictEqual(p.is_verified_compatible, true, 'Every part recommended must be verified compatible');
        }
        console.log('  [PASS] Module 2: AI Spare-Part Recommender strictly enforces verified catalogue compatibility');
      }

      // TEST 4: Module 3 - Predictive Maintenance & Component Wear Curves
      {
        const res = await fetch(`${baseUrl}/ai/predict/maintenance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
          body: JSON.stringify({
            model: 'Bajaj Pulsar 150',
            currentMileage: 14500,
            lastServiceMileage: 11000,
            avgMonthlyKm: 650,
          }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.overall_health_score >= 0 && json.data.overall_health_score <= 100);
        assert.ok(json.data.predicted_maintenance_window_days > 0);
        assert.ok(json.data.component_assessments.length >= 5);
        assert.ok(json.data.confidence_score > 0);
        assert.ok(json.data.disclaimer.includes('Probabilistic engineering wear model'));
        console.log('  [PASS] Module 3: Predictive Maintenance engine projects wear curves and failure probability');
      }

      // TEST 5: Module 4 - Inventory Demand Forecasting
      {
        const res = await fetch(`${baseUrl}/ai/forecast/inventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.total_parts_analyzed > 0);
        assert.ok(Array.isArray(json.data.forecasts));
        const first = json.data.forecasts[0];
        assert.ok(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(first.stockout_risk));
        assert.ok(first.reorder_point > 0);
        console.log('  [PASS] Module 4: Inventory Demand Forecasting calculates run rates, ROP, and stockout risk');
      }

      // TEST 6: Module 5 - Customer Intelligence & Retention Analytics
      {
        const res = await fetch(`${baseUrl}/ai/intelligence/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.total_customers_analyzed > 0);
        assert.ok(json.data.avg_customer_lifetime_value >= 0);
        assert.ok(Array.isArray(json.data.customer_segments));
        console.log('  [PASS] Module 5: Customer Intelligence segments accounts, identifies churn risk, and calculates CLV');
      }

      // TEST 7: Role Protection & Vertical Privilege Isolation
      {
        // Customer attempting to call Inventory Forecasting -> 403 Forbidden
        const resForecast = await fetch(`${baseUrl}/ai/forecast/inventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
        });
        assert.strictEqual(resForecast.status, 403);

        // Customer attempting to call Customer Intelligence -> 403 Forbidden
        const resIntel = await fetch(`${baseUrl}/ai/intelligence/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${customerToken}`,
          },
        });
        assert.strictEqual(resIntel.status, 403);

        // Unauthenticated request -> 401 Unauthorized
        const resUnauth = await fetch(`${baseUrl}/ai/recommend/maintenance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand: 'Hero', model: 'Splendor', mileage: 5000 }),
        });
        assert.strictEqual(resUnauth.status, 401);

        console.log('  [PASS] Role Protection: Regular customers strictly prohibited from executive forecasts & CRM intelligence (403)');
      }

      console.log('\n====================================================');
      console.log('ALL 7/7 PHASE 5 AI ENGINE TESTS PASSED!');
      console.log('====================================================\n');

      await teardown();
      process.exit(0);
    } catch (err) {
      console.error('\n[FAIL] Phase 5 Test Failed:', err);
      await teardown();
      process.exit(1);
    }
  })
  .catch(async (err) => {
    console.error('Phase 5 setup error:', err);
    await teardown();
    process.exit(1);
  });
