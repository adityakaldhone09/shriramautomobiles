import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db } from '../../backend/src/db/client';
import {
  usersTable,
  customersTable,
  customerVehiclesTable,
  bookingsTable,
  mechanicsTable,
  sparePartsTable,
} from '../../backend/src/db/schema';

async function runPhase1Suite() {
  console.log('====================================================');
  console.log('RUNNING PHASE 1: CORE FOUNDATION & RBAC TEST SUITE');
  console.log('====================================================\n');

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
    const timestamp = Date.now();

    // 1. Create a Super Admin
    const [superAdminUser] = await db
      .insert(usersTable)
      .values({
        name: 'Super Owner',
        phone: `99111${String(timestamp).slice(-5)}`,
        email: `superadmin_${timestamp}@shriram.local`,
        passwordHash: hashPassword('SuperAdminPass123!'),
        role: 'SUPER_ADMIN',
      })
      .returning();
    const superAdminToken = createToken(superAdminUser);

    // 2. Create an Admin
    const [adminUser] = await db
      .insert(usersTable)
      .values({
        name: 'Workshop Manager',
        phone: `99222${String(timestamp).slice(-5)}`,
        email: `manager_${timestamp}@shriram.local`,
        passwordHash: hashPassword('ManagerPass123!'),
        role: 'ADMIN',
      })
      .returning();
    const adminToken = createToken(adminUser);

    // 3. Create a Customer
    const [customerRecord] = await db
      .insert(customersTable)
      .values({
        name: 'Ramesh Kadam',
        phone: `99333${String(timestamp).slice(-5)}`,
        email: `ramesh_${timestamp}@shriram.local`,
      })
      .returning();

    const [customerUser] = await db
      .insert(usersTable)
      .values({
        name: 'Ramesh Kadam',
        phone: customerRecord.phone,
        email: customerRecord.email,
        passwordHash: hashPassword('CustomerPass123!'),
        role: 'CUSTOMER',
        customerId: customerRecord.id,
      })
      .returning();
    const customerToken = createToken(customerUser);

    // 4. Create a Mechanic
    const [mechanicRecord] = await db
      .insert(mechanicsTable)
      .values({
        name: 'Sachin Shinde',
        phone: `99444${String(timestamp).slice(-5)}`,
        experience: 8,
        specialization: 'Engine & Gearbox Specialist',
        isAvailable: true,
      })
      .returning();

    // =============================================================
    // TEST CASES
    // =============================================================

    await test('SUPER_ADMIN can access /api/admin/overview', async () => {
      const res = await fetch(`${baseUrl}/admin/overview`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.kpis);
      assert.ok(typeof json.data.kpis.totalCustomers === 'number');
      assert.ok(typeof json.data.kpis.totalVehicles === 'number');
      assert.ok(typeof json.data.kpis.totalBookings === 'number');
    });

    await test('CUSTOMER cannot access /api/admin/overview (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/admin/overview`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.equal(res.status, 403);
    });

    await test('Admin can list customers with search filter', async () => {
      const res = await fetch(`${baseUrl}/admin/customers?q=Ramesh`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      const match = json.data.find((c: any) => c.id === customerRecord.id);
      assert.ok(match, 'Customer Ramesh should be returned in search results');
      assert.equal(match.name, 'Ramesh Kadam');
    });

    await test('Admin can create a new customer', async () => {
      const newPhone = `99555${String(timestamp).slice(-5)}`;
      const res = await fetch(`${baseUrl}/admin/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Pooja Patil',
          phone: newPhone,
          email: `pooja_${timestamp}@shriram.local`,
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.name, 'Pooja Patil');
      assert.equal(json.data.phone, newPhone);
    });

    await test('Admin can update customer details', async () => {
      const res = await fetch(`${baseUrl}/admin/customers/${customerRecord.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Ramesh Kadam Updated',
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.name, 'Ramesh Kadam Updated');
    });

    await test('Admin can register a vehicle for a customer', async () => {
      const regNumber = `MH10AB${String(timestamp).slice(-4)}`;
      const res = await fetch(`${baseUrl}/admin/vehicles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerRecord.id,
          brand: 'Hero',
          model: 'Splendor Plus',
          vehicleType: 'Motorcycle',
          registrationNumber: regNumber,
          manufactureYear: 2022,
          color: 'Black and Red',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.registrationNumber, regNumber);
      assert.equal(json.data.customerId, customerRecord.id);
    });

    await test('Admin can get customer details with linked vehicle', async () => {
      const res = await fetch(`${baseUrl}/admin/customers/${customerRecord.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.customer.id, customerRecord.id);
      assert.ok(Array.isArray(json.data.vehicles));
      assert.ok(json.data.vehicles.length >= 1, 'Should contain at least 1 registered vehicle');
    });

    await test('Admin can list mechanics with active workload count', async () => {
      const res = await fetch(`${baseUrl}/admin/mechanics`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      const mech = json.data.find((m: any) => m.id === mechanicRecord.id);
      assert.ok(mech);
      assert.ok(typeof mech.activeWorkload === 'number');
    });

    console.log(`\n====================================================`);
    console.log(`ALL ${passedTests}/${totalTests} PHASE 1 TESTS PASSED!`);
    console.log(`====================================================\n`);
  } finally {
    server.close();
  }
}

runPhase1Suite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

