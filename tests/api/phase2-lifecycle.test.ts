import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db, ensureDbInitialized } from '../../backend/src/db/client';
import {
  usersTable,
  customersTable,
  customerVehiclesTable,
  bookingsTable,
  mechanicsTable,
  serviceJobCardsTable,
  jobCardInspectionsTable,
  jobCardPartsTable,
  serviceStatusHistoryTable,
} from '../../backend/src/db/schema';

async function runPhase2Suite() {
  console.log('====================================================');
  console.log('RUNNING PHASE 2: AUTOMOTIVE OPERATIONS & LIFECYCLE');
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

    // 1. Create Staff / Admin user
    const [staffUser] = await db
      .insert(usersTable)
      .values({
        name: 'Service Advisor Santosh',
        phone: `98111${String(timestamp).slice(-5)}`,
        email: `advisor_${timestamp}@shriram.local`,
        passwordHash: hashPassword('AdvisorPass123!'),
        role: 'STAFF',
      })
      .returning();
    const staffToken = createToken(staffUser);

    // 2. Create Mechanic user & mechanic record
    const mechPhone = `98222${String(timestamp).slice(-5)}`;
    const [mechanicRecord] = await db
      .insert(mechanicsTable)
      .values({
        name: 'Kailas Mechanic',
        phone: mechPhone,
        experience: 10,
        specialization: 'Periodic Service & Engine',
        isAvailable: true,
      })
      .returning();

    const [mechanicUser] = await db
      .insert(usersTable)
      .values({
        name: 'Kailas Mechanic',
        phone: mechPhone,
        email: `kailas_${timestamp}@shriram.local`,
        passwordHash: hashPassword('MechanicPass123!'),
        role: 'MECHANIC',
      })
      .returning();
    const mechanicToken = createToken(mechanicUser);

    // 3. Create Customer and Vehicle
    const custPhone = `98333${String(timestamp).slice(-5)}`;
    const [custRecord] = await db
      .insert(customersTable)
      .values({
        name: 'Ganesh Shinde',
        phone: custPhone,
        email: `ganesh_${timestamp}@shriram.local`,
      })
      .returning();

    const [customerUser] = await db
      .insert(usersTable)
      .values({
        name: 'Ganesh Shinde',
        phone: custPhone,
        email: custRecord.email,
        passwordHash: hashPassword('CustomerPass123!'),
        role: 'CUSTOMER',
        customerId: custRecord.id,
      })
      .returning();
    const customerToken = createToken(customerUser);

    const [vehRecord] = await db
      .insert(customerVehiclesTable)
      .values({
        customerId: custRecord.id,
        userId: customerUser.id,
        brand: 'Honda',
        model: 'Activa 6G',
        vehicleType: 'Scooter',
        registrationNumber: `MH10AX${String(timestamp).slice(-4)}`,
        manufactureYear: 2021,
      })
      .returning();

    // 4. Create Booking
    let bookingId: number;

    await test('Customer creates service booking in PENDING state', async () => {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'Ganesh Shinde',
          phone: custPhone,
          email: custRecord.email,
          vehicleBrand: 'Honda',
          vehicleModel: 'Activa 6G',
          registrationNumber: vehRecord.registrationNumber,
          customerVehicleId: vehRecord.id,
          appointmentDate: new Date().toISOString(),
          timeSlot: '10:00 AM - 11:00 AM',
          problemDescription: 'Engine oil service and front brake screeching sound',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.status, 'PENDING');
      bookingId = json.data.id;
    });

    await test('Staff confirms booking and assigns mechanic', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/assign-mechanic`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mechanicId: mechanicRecord.id }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.status, 'CONFIRMED');
      assert.equal(json.data.assignedMechanicId, mechanicRecord.id);
    });

    let jobCardId: number;
    await test('Staff checks in vehicle and generates Job Card with 10 standard inspection items', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/job-card`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odometerReading: 18450,
          fuelLevel: 'HALF',
          customerComplaints: 'Engine oil service and front brake screeching sound',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.jobNumber.startsWith('JC-'));
      assert.equal(json.data.status, 'CHECKED_IN');
      assert.equal(json.data.odometerReading, 18450);
      assert.ok(Array.isArray(json.data.inspections));
      assert.equal(json.data.inspections.length, 10, 'Should initialize 10 standard two-wheeler inspection items');
      jobCardId = json.data.id;
    });

    await test('Mechanic records inspection checklist item condition', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/job-card/inspections`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: 'Engine Oil Level & Quality',
          condition: 'CRITICAL',
          notes: 'Oil level below minimum, highly viscous & black',
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.condition, 'CRITICAL');
    });

    await test('Mechanic logs consumed spare part on Job Card and totals recalculate', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/job-card/parts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partName: 'Castrol Activ 4T 10W-30 800ml',
          quantity: 1,
          unitPrice: 385,
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(Number(json.data.totalPrice), 385);

      // Verify Job Card partsTotal updated
      const jcRes = await fetch(`${baseUrl}/bookings/${bookingId}/job-card`, {
        headers: { Authorization: `Bearer ${mechanicToken}` },
      });
      const jcJson = await jcRes.json();
      assert.equal(Number(jcJson.data.partsTotal), 385);
    });

    await test('Mechanic updates work performed and labour charges', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/job-card`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workPerformed: 'Replaced engine oil with Castrol 10W-30, cleaned air filter, adjusted brake shoe play',
          labourCharges: 150,
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(Number(json.data.labourCharges), 150);
      assert.equal(Number(json.data.totalAmount), 535, '385 parts + 150 labour = 535');
    });

    await test('Lifecycle progression: CHECKED_IN -> IN_PROGRESS -> QUALITY_CHECK -> COMPLETED -> DELIVERED', async () => {
      // Step 1: CHECKED_IN -> IN_PROGRESS
      const step1 = await fetch(`${baseUrl}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'IN_PROGRESS', notes: 'Vehicle on service bay #2' }),
      });
      assert.equal(step1.status, 200);

      // Step 2: IN_PROGRESS -> QUALITY_CHECK
      const step2 = await fetch(`${baseUrl}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'QUALITY_CHECK', notes: 'Servicing complete, road test pending' }),
      });
      assert.equal(step2.status, 200);

      // Step 3: QUALITY_CHECK -> COMPLETED
      const step3 = await fetch(`${baseUrl}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'COMPLETED', notes: 'Quality inspection passed, ready for customer' }),
      });
      assert.equal(step3.status, 200);

      // Step 4: COMPLETED -> DELIVERED
      const step4 = await fetch(`${baseUrl}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'DELIVERED', notes: 'Vehicle handed over to customer' }),
      });
      assert.equal(step4.status, 200);
      const json = await step4.json();
      assert.equal(json.data.status, 'DELIVERED');
    });

    await test('Audit trail: Booking timeline records all lifecycle transitions', async () => {
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/timeline`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length >= 4, 'Should contain all recorded status transitions');
      const statuses = json.data.map((h: any) => h.toStatus);
      assert.ok(statuses.includes('DELIVERED'));
      assert.ok(statuses.includes('COMPLETED'));
      assert.ok(statuses.includes('IN_PROGRESS'));
    });

    await test('Mechanic endpoint /api/mechanics/my-jobs returns assigned job with job card data', async () => {
      const res = await fetch(`${baseUrl}/mechanics/my-jobs`, {
        headers: { Authorization: `Bearer ${mechanicToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      const job = json.data.find((j: any) => j.id === bookingId);
      assert.ok(job, 'Assigned job should be returned in mechanic jobs roster');
      assert.ok(job.jobCard, 'Job card summary should be included');
      assert.equal(job.jobCard.id, jobCardId);
      assert.equal(Number(job.jobCard.totalAmount), 535);
    });

    console.log(`\n====================================================`);
    console.log(`ALL ${passedTests}/${totalTests} PHASE 2 TESTS PASSED!`);
    console.log(`====================================================\n`);
  } finally {
    server.close();
  }
}

runPhase2Suite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
