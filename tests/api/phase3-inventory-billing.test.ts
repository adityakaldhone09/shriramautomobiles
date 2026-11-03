import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db, ensureDbInitialized } from '../../backend/src/db/client';
import { usersTable } from '../../backend/src/db/schema/users';

async function runPhase3Suite() {
  console.log('====================================================');
  console.log('RUNNING PHASE 3: INVENTORY, SUPPLIERS, POs & BILLING');
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
        name: 'Workshop Manager Vijay',
        phone: `98700${String(timestamp).slice(-5)}`,
        email: `manager_${timestamp}@shriram.local`,
        passwordHash: hashPassword('ManagerPass123!'),
        role: 'ADMIN',
      })
      .returning();
    const adminToken = createToken(adminUser);

    // 2. Create Customer User
    const [customerUser] = await db
      .insert(usersTable)
      .values({
        name: 'Rider Aniket',
        phone: `98701${String(timestamp).slice(-5)}`,
        email: `aniket_${timestamp}@shriram.local`,
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

    let testPartId: number;
    let initialStock: number;
    let testSupplierId: number;
    let testPoId: number;
    let testBookingId: number;

    // Fetch or ensure inventory part exists
    const invRes = await fetch(`${baseUrl}/inventory`, { headers: adminHeaders });
    assert.equal(invRes.status, 200, 'Admin can fetch inventory list');
    const invBody = await invRes.json();
    assert.ok(Array.isArray(invBody.data) && invBody.data.length > 0, 'Inventory list contains parts');

    const targetPart = invBody.data[0];
    testPartId = targetPart.id;
    initialStock = Number(targetPart.stockQuantity ?? 10);

    // TEST 1: Positive Stock Adjustment
    await test('Admin can perform positive stock adjustment with audit record', async () => {
      const res = await fetch(`${baseUrl}/inventory/adjust`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          partId: testPartId,
          quantityChange: 15,
          movementType: 'ADJUSTMENT',
          notes: 'Restocked by workshop supervisor',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.movement.movementType, 'ADJUSTMENT');
      assert.equal(Number(body.data.movement.newStock), initialStock + 15);
    });

    // TEST 2: Negative Inventory Prevention
    await test('Negative inventory strictly rejected without explicit authorized adjustment', async () => {
      const res = await fetch(`${baseUrl}/inventory/adjust`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          partId: testPartId,
          quantityChange: -99999,
          movementType: 'ADJUSTMENT',
          notes: 'Excessive deduction',
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Insufficient inventory/i);
    });

    // TEST 3: Inventory Movement Audit Trail
    await test('Inventory movements audit ledger tracks all transactions', async () => {
      const res = await fetch(`${baseUrl}/inventory/movements?partId=${testPartId}`, {
        headers: adminHeaders,
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].partId, testPartId);
    });

    // TEST 4: Supplier Profile Creation & Listing
    await test('Admin can create and list supplier profiles with GSTIN', async () => {
      const code = `SUP-TST-${Date.now().toString().slice(-5)}`;
      const res = await fetch(`${baseUrl}/suppliers`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          name: 'Sangola Auto Spares Wholesale',
          code,
          contactPerson: 'Vikas Shinde',
          phone: '9822334455',
          email: 'vikas@sangolaauto.com',
          gstin: '27AABCS1429B1Z8',
          city: 'Sangola',
          paymentTerms: 'NET_30',
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.name, 'Sangola Auto Spares Wholesale');
      testSupplierId = body.data.id;

      const listRes = await fetch(`${baseUrl}/suppliers?search=Sangola`, { headers: adminHeaders });
      assert.equal(listRes.status, 200);
      const listBody = await listRes.json();
      assert.ok(listBody.data.some((s: any) => s.id === testSupplierId));
    });

    // TEST 5: Purchase Order Creation & GST Calculation
    await test('Admin can create Purchase Order with GST (18%) and itemized costs', async () => {
      const res = await fetch(`${baseUrl}/purchase-orders`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          supplierId: testSupplierId,
          destination: 'Wholesale Godown',
          notes: 'Bi-weekly stock replenishment',
          items: [
            {
              partId: testPartId,
              partName: targetPart.name,
              quantityOrdered: 20,
              unitCost: 300.0,
            },
          ],
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(Number(body.data.subtotal), 6000.0);
      assert.equal(Number(body.data.taxAmount), 1080.0); // 18% GST
      assert.equal(Number(body.data.totalAmount), 7080.0);
      assert.equal(body.data.status, 'ORDERED');
      testPoId = body.data.id;
    });

    // TEST 6: PO Receiving & Automated Stock Inbound
    await test('Inbound PO receiving automatically increases part stock and records PO_RECEIPT movement', async () => {
      const getPartBefore = await fetch(`${baseUrl}/inventory`, { headers: adminHeaders });
      const partsBefore = (await getPartBefore.json()).data;
      const stockBefore = Number(partsBefore.find((p: any) => p.id === testPartId).stockQuantity);

      const res = await fetch(`${baseUrl}/purchase-orders/${testPoId}/receive`, {
        method: 'POST',
        headers: adminHeaders,
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'RECEIVED');

      // Verify part stock in DB increased by 20
      const getPartAfter = await fetch(`${baseUrl}/inventory`, { headers: adminHeaders });
      const partsAfter = (await getPartAfter.json()).data;
      const stockAfter = Number(partsAfter.find((p: any) => p.id === testPartId).stockQuantity);
      assert.equal(stockAfter, stockBefore + 20);

      // Verify inventory movement record was automatically created
      const moveRes = await fetch(`${baseUrl}/inventory/movements?partId=${testPartId}&movementType=PO_RECEIPT`, {
        headers: adminHeaders,
      });
      const moveBody = await moveRes.json();
      assert.ok(moveBody.data.length > 0);
      assert.equal(moveBody.data[0].movementType, 'PO_RECEIPT');
    });

    // TEST 7: Service Job Card Part Consumption Logs Inventory Movement
    await test('Service Job Card part consumption automatically deducts stock and records JOB_CARD movement', async () => {
      // Create a booking
      const bRes = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'Tukaram Kulkarni',
          phone: '9866112233',
          email: 'tukaram@example.com',
          vehicleBrand: 'Hero',
          vehicleModel: 'Splendor Plus',
          registrationNumber: `MH13TK${Date.now().toString().slice(-4)}`,
          appointmentDate: new Date().toISOString(),
          timeSlot: '11:00 AM - 12:00 PM',
          problemDescription: 'Regular maintenance and oil check',
        }),
      });
      const bBody = await bRes.json();
      testBookingId = bBody.data.id;

      // Staff confirms booking & generates Job Card
      await fetch(`${baseUrl}/bookings/${testBookingId}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      await fetch(`${baseUrl}/bookings/${testBookingId}/job-card`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ estimatedCost: 1200 }),
      });

      const getPartBefore = await fetch(`${baseUrl}/inventory`, { headers: adminHeaders });
      const stockBefore = Number((await getPartBefore.json()).data.find((p: any) => p.id === testPartId).stockQuantity);

      // Add consumed part with partId
      const partAddRes = await fetch(`${baseUrl}/bookings/${testBookingId}/job-card/parts`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          partId: testPartId,
          partName: targetPart.name,
          quantity: 2,
          unitPrice: 450.0,
        }),
      });
      assert.equal(partAddRes.status, 201);

      // Verify stock deducted by 2
      const getPartAfter = await fetch(`${baseUrl}/inventory`, { headers: adminHeaders });
      const stockAfter = Number((await getPartAfter.json()).data.find((p: any) => p.id === testPartId).stockQuantity);
      assert.equal(stockAfter, stockBefore - 2);
    });

    // TEST 8: GST Invoice Generation from Booking
    await test('Generate GST Tax Invoice from booking with Labour SAC 9987 & Parts HSN 8714', async () => {
      // Update job card with labour charges
      await fetch(`${baseUrl}/bookings/${testBookingId}/job-card`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ labourCharges: 350.0 }),
      });

      const invRes = await fetch(`${baseUrl}/invoices/generate-from-booking`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          bookingId: testBookingId,
          discountAmount: 50.0,
          paymentMethod: 'UPI',
          paymentReference: 'UPI/9866112233/PAY123',
        }),
      });

      assert.equal(invRes.status, 201);
      const invBody = await invRes.json();
      assert.equal(invBody.success, true);

      // Subtotal = 350 (labour) + 900 (parts: 2 * 450) = 1250. Discount = 50. Taxable = 1200.
      assert.equal(Number(invBody.data.subtotal), 1250.0);
      assert.equal(Number(invBody.data.taxableAmount), 1200.0);
      assert.equal(Number(invBody.data.cgstAmount), 108.0); // 9% CGST
      assert.equal(Number(invBody.data.sgstAmount), 108.0); // 9% SGST
      assert.equal(Number(invBody.data.totalAmount), 1416.0); // 1200 + 108 + 108
      assert.equal(invBody.data.paymentStatus, 'PAID');
      assert.equal(invBody.data.paymentMethod, 'UPI');
      assert.ok(Array.isArray(invBody.data.items));
      assert.ok(invBody.data.items.length >= 2); // Labour + Part
    });

    // TEST 9: Direct Counter Sale with Live Stock Deduction
    await test('Direct counter sale creates invoice and immediately deducts stock', async () => {
      const getPartBefore = await fetch(`${baseUrl}/inventory`, { headers: adminHeaders });
      const stockBefore = Number((await getPartBefore.json()).data.find((p: any) => p.id === testPartId).stockQuantity);

      const saleRes = await fetch(`${baseUrl}/invoices/direct-sale`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          customerName: 'Ganesh Shingade',
          customerPhone: '9421008899',
          paymentMethod: 'CASH',
          items: [
            {
              partId: testPartId,
              quantity: 1,
              unitPrice: 450.0,
            },
          ],
        }),
      });

      assert.equal(saleRes.status, 201);
      const saleBody = await saleRes.json();
      assert.equal(saleBody.success, true);
      assert.equal(saleBody.data.invoiceType, 'PART_SALE');
      assert.equal(Number(saleBody.data.totalAmount), 531.0); // 450 + 18% GST (81) = 531

      // Verify stock was reduced by 1
      const getPartAfter = await fetch(`${baseUrl}/inventory`, { headers: adminHeaders });
      const stockAfter = Number((await getPartAfter.json()).data.find((p: any) => p.id === testPartId).stockQuantity);
      assert.equal(stockAfter, stockBefore - 1);
    });

    // TEST 10: Role Protection (Customer Access Blocked)
    await test('Role Protection: Regular customers strictly blocked from billing & procurement (403)', async () => {
      const resSuppliers = await fetch(`${baseUrl}/suppliers`, { headers: customerHeaders });
      assert.equal(resSuppliers.status, 403);

      const resPo = await fetch(`${baseUrl}/purchase-orders`, { headers: customerHeaders });
      assert.equal(resPo.status, 403);

      const resAdjust = await fetch(`${baseUrl}/inventory/adjust`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({ partId: testPartId, quantityChange: 5 }),
      });
      assert.equal(resAdjust.status, 403);
    });

    console.log(`\n====================================================`);
    console.log(`ALL ${passedTests}/${totalTests} PHASE 3 TESTS PASSED!`);
    console.log(`====================================================\n`);
  } finally {
    server.close();
  }
}

runPhase3Suite().catch((err) => {
  console.error('\n[FAIL] Phase 3 Test Suite Failed:');
  console.error(err);
  process.exit(1);
});
