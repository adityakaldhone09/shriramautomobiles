import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword, verifyPassword, readToken } from '../../backend/src/middleware/auth';
import { db, sql, isInMemory } from '../../backend/src/db/client';
import {
  usersTable,
  customersTable,
  customerVehiclesTable,
  bookingsTable,
  serviceEstimatesTable,
  notificationsTable,
  sparePartsTable,
} from '../../backend/src/db/schema';

async function runSecuritySuite() {
  console.log('====================================================');
  console.log('RUNNING AUTOMATED MASTER SECURITY REGRESSION TESTS');
  console.log('====================================================\n');

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

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
    // -------------------------------------------------------------
    // Test Setup: Seed test users
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const [custA] = await db
      .insert(customersTable)
      .values({
        name: 'Alice Customer',
        phone: `98765${String(timestamp).slice(-5)}`,
        email: `alice_${timestamp}@test.local`,
      })
      .returning();

    const [userA] = await db
      .insert(usersTable)
      .values({
        name: 'Alice Customer',
        phone: custA.phone,
        email: custA.email,
        passwordHash: hashPassword('ValidPass123!'),
        role: 'CUSTOMER',
        customerId: custA.id,
      })
      .returning();

    const [custB] = await db
      .insert(customersTable)
      .values({
        name: 'Bob Customer',
        phone: `98766${String(timestamp).slice(-5)}`,
        email: `bob_${timestamp}@test.local`,
      })
      .returning();

    const [userB] = await db
      .insert(usersTable)
      .values({
        name: 'Bob Customer',
        phone: custB.phone,
        email: custB.email,
        passwordHash: hashPassword('ValidPass123!'),
        role: 'CUSTOMER',
        customerId: custB.id,
      })
      .returning();

    const [adminUser] = await db
      .insert(usersTable)
      .values({
        name: 'Admin Boss',
        phone: `98767${String(timestamp).slice(-5)}`,
        email: `admin_${timestamp}@test.local`,
        passwordHash: hashPassword('AdminPass123!'),
        role: 'ADMIN',
      })
      .returning();

    const tokenA = createToken({ id: userA.id, customerId: custA.id, role: userA.role, phone: userA.phone });
    const tokenB = createToken({ id: userB.id, customerId: custB.id, role: userB.role, phone: userB.phone });
    const adminToken = createToken({ id: adminUser.id, role: adminUser.role, phone: adminUser.phone });

    // Seed Bob's vehicle
    const [vehicleB] = await db
      .insert(customerVehiclesTable)
      .values({
        userId: userB.id,
        customerId: custB.id,
        brand: 'Honda',
        model: 'Activa 6G',
        vehicleType: 'Scooter',
        registrationNumber: `MH12BOB${String(timestamp).slice(-4)}`,
        manufactureYear: 2022,
      })
      .returning();

    // Seed Bob's booking
    const [bookingB] = await db
      .insert(bookingsTable)
      .values({
        bookingNumber: `SAB-TEST-${timestamp}`,
        bookingId: `SAB-TEST-${timestamp}`,
        userId: userB.id,
        customerId: custB.id,
        customerVehicleId: vehicleB.id,
        timeSlot: '10:00 AM',
        status: 'PENDING',
      })
      .returning();

    // Seed Bob's estimate
    const [estimateB] = await db
      .insert(serviceEstimatesTable)
      .values({
        bookingId: bookingB.id,
        totalAmount: '1500.00',
        labourAmount: '500.00',
        partsAmount: '1000.00',
        status: 'PENDING',
      })
      .returning();

    // Seed Bob's notification
    const [notifB] = await db
      .insert(notificationsTable)
      .values({
        userId: userB.id,
        title: 'Booking Confirmed',
        message: 'Your service is booked.',
        type: 'BOOKING',
      })
      .returning();

    // -------------------------------------------------------------
    // PHASE 3: AUTHENTICATION TESTS
    // -------------------------------------------------------------
    console.log('\n--- Phase 3: Authentication & Token Security ---');

    await test('Malformed JWT tokens reject safely with 401 (no unhandled server crash)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: 'Bearer this.is.invalid.jwt.format' },
      });
      assert.equal(res.status, 401);
    });

    await test('Tampered token signature is rejected with 401', async () => {
      const [payload] = tokenA.split('.');
      const tamperedToken = `${payload}.invalidSignatureValue123`;
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });
      assert.equal(res.status, 401);
    });

    await test('Empty or garbage auth header returns 401', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: 'Bearer ' },
      });
      assert.equal(res.status, 401);
    });

    await test('verifyPassword handles corrupted or non-hex hash gracefully without crashing', async () => {
      assert.equal(verifyPassword('password', 'invalid-hash-string'), false);
      assert.equal(verifyPassword('password', 'salt:'), false);
      assert.equal(verifyPassword('password', 'salt:nothex123'), false);
    });

    // -------------------------------------------------------------
    // PHASE 4 & 6: AUTHORIZATION & IDOR/BOLA TESTS
    // -------------------------------------------------------------
    console.log('\n--- Phase 4 & 6: Authorization & IDOR/BOLA Resistance ---');

    await test('IDOR Prevented: Customer A cannot view Customer B vehicle', async () => {
      const res = await fetch(`${baseUrl}/account/vehicles/${vehicleB.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 404);
    });

    await test('IDOR Prevented: Customer A cannot update Customer B vehicle', async () => {
      const res = await fetch(`${baseUrl}/account/vehicles/${vehicleB.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: 'Hacked Nickname' }),
      });
      assert.equal(res.status, 404);
    });

    await test('IDOR Prevented: Customer A cannot delete Customer B vehicle', async () => {
      const res = await fetch(`${baseUrl}/account/vehicles/${vehicleB.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 404);
    });

    await test('IDOR Prevented: Customer A cannot mark Customer B notification as read', async () => {
      const res = await fetch(`${baseUrl}/account/notifications/${notifB.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 404);
    });

    await test('IDOR Prevented: Customer A cannot view Customer B booking by ID', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingB.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 403);
    });

    await test('IDOR Prevented: Customer A cannot approve Customer B estimate', async () => {
      const res = await fetch(`${baseUrl}/estimates/${bookingB.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 403);
    });

    await test('IDOR Prevented: Customer A cannot reject Customer B estimate', async () => {
      const res = await fetch(`${baseUrl}/estimates/${bookingB.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 403);
    });

    // -------------------------------------------------------------
    // PHASE 5: ROLE-BASED ACCESS CONTROL (VERTICAL ESCALATION)
    // -------------------------------------------------------------
    console.log('\n--- Phase 5: Role Security & Vertical Privilege Escalation ---');

    await test('Privilege Escalation Blocked: CUSTOMER cannot access /api/admin/inventory', async () => {
      const res = await fetch(`${baseUrl}/admin/inventory`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 403);
    });

    await test('Privilege Escalation Blocked: CUSTOMER cannot access /api/admin/customers', async () => {
      const res = await fetch(`${baseUrl}/admin/customers`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 403);
    });

    await test('Privilege Escalation Blocked: CUSTOMER cannot create spare parts', async () => {
      const res = await fetch(`${baseUrl}/parts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Malicious Part', sku: 'MAL-1' }),
      });
      assert.equal(res.status, 403);
    });

    await test('Privilege Escalation Blocked: CUSTOMER cannot assign mechanics to bookings', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingB.id}/assign-mechanic`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mechanicId: 1 }),
      });
      assert.equal(res.status, 403);
    });

    await test('Admin access succeeds for /api/admin/inventory', async () => {
      const res = await fetch(`${baseUrl}/admin/inventory`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
    });

    // -------------------------------------------------------------
    // PHASE 7 & 25: BOOKING STATE MACHINE ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- Phase 7 & 25: State Machine Enforcement ---');

    await test('Invalid State Regression Blocked: Cannot jump directly from PENDING to COMPLETED', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingB.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error, 'INVALID_STATE_TRANSITION');
    });

    await test('Valid State Progression Allowed: PENDING -> CONFIRMED', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingB.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      assert.equal(res.status, 200);
    });

    // -------------------------------------------------------------
    // PHASE 9 & 26: DATA EXPOSURE AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Phase 9 & 26: Data Exposure & Sanitization ---');

    await test('Internal supplier and purchasePrice fields are stripped in public parts catalog', async () => {
      const res = await fetch(`${baseUrl}/parts`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(Array.isArray(json.data));
      if (json.data.length > 0) {
        const item = json.data[0];
        assert.equal(item.purchasePrice, undefined, 'purchasePrice must not be exposed');
        assert.equal(item.supplier, undefined, 'supplier must not be exposed');
      }
    });

    await test('Mechanic private phone numbers are stripped from public mechanics endpoint', async () => {
      const res = await fetch(`${baseUrl}/mechanics`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(Array.isArray(json.data));
      if (json.data.length > 0) {
        const item = json.data[0];
        assert.equal(item.phone, undefined, 'Mechanic phone number must not be exposed to public');
      }
    });

    // -------------------------------------------------------------
    // PHASE 11: CART SECURITY
    // -------------------------------------------------------------
    console.log('\n--- Phase 11: Cart Security ---');

    await test('Cart rejects non-positive or excessive quantities', async () => {
      const resZero = await fetch(`${baseUrl}/cart/items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: 1, quantity: 0 }),
      });
      assert.equal(resZero.status, 400);

      const resExcess = await fetch(`${baseUrl}/cart/items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: 1, quantity: 99999 }),
      });
      assert.equal(resExcess.status, 400);
    });

    // -------------------------------------------------------------
    // PHASE 19 & 20: SECURITY HEADERS & CORS
    // -------------------------------------------------------------
    console.log('\n--- Phase 19 & 20: Security Headers & CORS ---');

    await test('Security headers are present on API responses', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });

    // -------------------------------------------------------------
    // PHASE 21: DATABASE ROW LEVEL SECURITY (RLS) & SCHEMA HYGIENE
    // -------------------------------------------------------------
    console.log('\n--- Phase 21: Database Row Level Security (RLS) & Schema Hygiene ---');

    await test('All public database tables have Row Level Security enabled (zero tables without RLS)', async () => {
      if (isInMemory) {
        return;
      }
      const rawUrl = process.env.DATABASE_URL || '';
      if (!rawUrl || rawUrl.includes('dummy') || rawUrl.includes('[YOUR-PASSWORD]')) {
        return;
      }

      const unsecuredRes = (await db.execute(
        sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`
      )) as any;
      const unsecRows = Array.isArray(unsecuredRes?.rows)
        ? unsecuredRes.rows
        : Array.isArray(unsecuredRes)
          ? unsecuredRes
          : [];
      assert.equal(
        unsecRows.length,
        0,
        `Found public tables with RLS disabled: ${unsecRows.map((r: any) => r.tablename).join(', ')}`
      );

      const securedRes = (await db.execute(
        sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;`
      )) as any;
      const secRows = Array.isArray(securedRes?.rows)
        ? securedRes.rows
        : Array.isArray(securedRes)
          ? securedRes
          : [];
      assert.ok(secRows.length >= 35, `Expected at least 35 secured tables, found ${secRows.length}`);
    });

    await test('Service role security policies exist for protected tables', async () => {
      if (isInMemory) {
        return;
      }
      const rawUrl = process.env.DATABASE_URL || '';
      if (!rawUrl || rawUrl.includes('dummy') || rawUrl.includes('[YOUR-PASSWORD]')) {
        return;
      }

      const res = (await db.execute(
        sql`SELECT COUNT(DISTINCT tablename) as count FROM pg_policies WHERE schemaname = 'public';`
      )) as any;
      const countRows = Array.isArray(res?.rows)
        ? res.rows
        : Array.isArray(res)
          ? res
          : [];
      const count = Number(countRows[0]?.count ?? 0);
      assert.ok(count >= 30, `Expected policies on >= 30 tables, found ${count}`);
    });

    console.log(`\n====================================================`);
    console.log(`ALL ${passedTests}/${totalTests} SECURITY REGRESSION TESTS PASSED!`);
    console.log(`====================================================\n`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runSecuritySuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Security test suite encountered an unhandled error:', err);
    process.exit(1);
  });
