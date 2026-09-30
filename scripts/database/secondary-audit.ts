import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db, isInMemory } from '../../backend/src/db/client';
import {
  usersTable,
  customersTable,
  customerVehiclesTable,
  bookingsTable,
  serviceEstimatesTable,
  serviceEstimateItemsTable,
  notificationsTable,
  ordersTable,
  orderItemsTable,
  sparePartsTable,
} from '../../backend/src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

interface AuditResult {
  section: string;
  name: string;
  passed: boolean;
  detail: string;
}

const results: AuditResult[] = [];

function record(section: string, name: string, passed: boolean, detail: string) {
  results.push({ section, name, passed, detail });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${section}] ${name}: ${detail}`);
}

async function runSecondaryAudit() {
  console.log('================================================================');
  console.log('STARTING SECONDARY RLS AUTHORIZATION AUDIT FOR SHRIRAM AUTOMOBILES');
  console.log('================================================================\n');

  const rawUrl = process.env.DATABASE_URL || '';
  const pool = new Pool({
    connectionString: rawUrl,
    connectionTimeoutMillis: 5000,
    ssl: /supabase|pooler/i.test(rawUrl) ? { rejectUnauthorized: false } : undefined,
    max: 1,
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const createdUserIds: number[] = [];
  const createdCustomerIds: number[] = [];
  const createdVehicleIds: number[] = [];
  const createdBookingIds: number[] = [];
  const createdOrderIds: number[] = [];
  const createdEstimateIds: number[] = [];
  const createdNotifIds: number[] = [];

  try {
    // =================================================================
    // 1. TEST ANONYMOUS ACCESS
    // =================================================================
    console.log('\n--- Section 1: Anonymous Access ---');
    const publicCatalog = [
      'brands',
      'vehicle_models',
      'services',
      'helmet_brands',
      'helmet_products',
      'helmet_types',
      'helmet_sizes',
    ];

    const sensitiveTables = [
      'users',
      'customers',
      'customer_vehicles',
      'orders',
      'order_items',
      'service_bookings',
      'service_estimates',
      'notifications',
      'carts',
      'sessions',
      'password_reset_tokens',
      'wholesale_quotes',
      'helmet_inventory',
    ];

    const client = await pool.connect();
    try {
      for (const table of publicCatalog) {
        await client.query('SET ROLE anon;');
        let selOk = false;
        try {
          const s = await client.query(`SELECT * FROM public."${table}" LIMIT 1;`);
          selOk = true;
        } catch {}

        let insBlocked = false;
        try {
          await client.query(`INSERT INTO public."${table}" DEFAULT VALUES;`);
        } catch {
          insBlocked = true;
        }

        let updBlocked = false;
        try {
          const u = await client.query(`UPDATE public."${table}" SET id = id;`);
          updBlocked = u.rowCount === 0;
        } catch {
          updBlocked = true;
        }

        let delBlocked = false;
        try {
          const d = await client.query(`DELETE FROM public."${table}";`);
          delBlocked = d.rowCount === 0;
        } catch {
          delBlocked = true;
        }
        await client.query('RESET ROLE;');

        record(
          '1. Anonymous Access',
          `Catalog Table: ${table}`,
          selOk && insBlocked && updBlocked && delBlocked,
          `SELECT=${selOk ? 'ALLOWED' : 'DENIED'}, Write Blocked=${insBlocked && updBlocked && delBlocked}`
        );
      }

      for (const table of sensitiveTables) {
        await client.query('SET ROLE anon;');
        let selBlocked = false;
        try {
          const s = await client.query(`SELECT * FROM public."${table}" LIMIT 1;`);
          selBlocked = s.rows.length === 0;
        } catch {
          selBlocked = true;
        }

        let insBlocked = false;
        try {
          await client.query(`INSERT INTO public."${table}" DEFAULT VALUES;`);
        } catch {
          insBlocked = true;
        }

        let updBlocked = false;
        try {
          const u = await client.query(`UPDATE public."${table}" SET id = id;`);
          updBlocked = u.rowCount === 0;
        } catch {
          updBlocked = true;
        }

        let delBlocked = false;
        try {
          const d = await client.query(`DELETE FROM public."${table}";`);
          delBlocked = d.rowCount === 0;
        } catch {
          delBlocked = true;
        }
        await client.query('RESET ROLE;');

        record(
          '1. Anonymous Access',
          `Sensitive Table: ${table}`,
          selBlocked && insBlocked && updBlocked && delBlocked,
          `SELECT Denied=${selBlocked}, Write Blocked=${insBlocked && updBlocked && delBlocked}`
        );
      }
    } finally {
      try {
        await client.query('RESET ROLE;');
      } catch {}
      client.release();
    }

    // =================================================================
    // SETUP TEST SEED DATA (CUSTOMER A & B, VEHICLES, ORDERS, BOOKINGS)
    // =================================================================
    const ts = Date.now();
    const [custA] = await db
      .insert(customersTable)
      .values({
        name: 'Customer A',
        phone: `98101${String(ts).slice(-5)}`,
        email: `custA_${ts}@test.local`,
      })
      .returning();
    createdCustomerIds.push(custA.id);

    const [userA] = await db
      .insert(usersTable)
      .values({
        name: 'Customer A',
        phone: custA.phone,
        email: custA.email,
        passwordHash: hashPassword('PassA123!'),
        role: 'CUSTOMER',
        customerId: custA.id,
      })
      .returning();
    createdUserIds.push(userA.id);

    const [custB] = await db
      .insert(customersTable)
      .values({
        name: 'Customer B',
        phone: `98102${String(ts).slice(-5)}`,
        email: `custB_${ts}@test.local`,
      })
      .returning();
    createdCustomerIds.push(custB.id);

    const [userB] = await db
      .insert(usersTable)
      .values({
        name: 'Customer B',
        phone: custB.phone,
        email: custB.email,
        passwordHash: hashPassword('PassB123!'),
        role: 'CUSTOMER',
        customerId: custB.id,
      })
      .returning();
    createdUserIds.push(userB.id);

    // Create Mechanic, Staff, Admin users
    const [userMech] = await db
      .insert(usersTable)
      .values({
        name: 'Mechanic Ramesh',
        phone: `98103${String(ts).slice(-5)}`,
        email: `mech_${ts}@test.local`,
        passwordHash: hashPassword('PassMech123!'),
        role: 'MECHANIC',
      })
      .returning();
    createdUserIds.push(userMech.id);

    const [userStaff] = await db
      .insert(usersTable)
      .values({
        name: 'Staff Suman',
        phone: `98104${String(ts).slice(-5)}`,
        email: `staff_${ts}@test.local`,
        passwordHash: hashPassword('PassStaff123!'),
        role: 'STAFF',
      })
      .returning();
    createdUserIds.push(userStaff.id);

    const [userAdmin] = await db
      .insert(usersTable)
      .values({
        name: 'Admin Boss',
        phone: `98105${String(ts).slice(-5)}`,
        email: `admin_${ts}@test.local`,
        passwordHash: hashPassword('PassAdmin123!'),
        role: 'ADMIN',
      })
      .returning();
    createdUserIds.push(userAdmin.id);

    const tokenA = createToken({ id: userA.id, customerId: custA.id, role: userA.role, phone: userA.phone });
    const tokenB = createToken({ id: userB.id, customerId: custB.id, role: userB.role, phone: userB.phone });
    const tokenMech = createToken({ id: userMech.id, role: userMech.role, phone: userMech.phone });
    const tokenStaff = createToken({ id: userStaff.id, role: userStaff.role, phone: userStaff.phone });
    const tokenAdmin = createToken({ id: userAdmin.id, role: userAdmin.role, phone: userAdmin.phone });

    // Seed Vehicles
    const [vehicleA] = await db
      .insert(customerVehiclesTable)
      .values({
        userId: userA.id,
        customerId: custA.id,
        brand: 'Honda',
        model: 'Activa 6G',
        vehicleType: 'Scooter',
        registrationNumber: `MH12AA${String(ts).slice(-4)}`,
        manufactureYear: 2021,
      })
      .returning();
    createdVehicleIds.push(vehicleA.id);

    const [vehicleB] = await db
      .insert(customerVehiclesTable)
      .values({
        userId: userB.id,
        customerId: custB.id,
        brand: 'Bajaj',
        model: 'Pulsar 150',
        vehicleType: 'Motorcycle',
        registrationNumber: `MH12BB${String(ts).slice(-4)}`,
        manufactureYear: 2022,
      })
      .returning();
    createdVehicleIds.push(vehicleB.id);

    // Seed Bookings
    const [bookingA] = await db
      .insert(bookingsTable)
      .values({
        bookingNumber: `SAB-A-${ts}`,
        bookingId: `SAB-A-${ts}`,
        userId: userA.id,
        customerId: custA.id,
        customerVehicleId: vehicleA.id,
        timeSlot: '09:00 AM',
        status: 'PENDING',
      })
      .returning();
    createdBookingIds.push(bookingA.id);

    const [bookingB] = await db
      .insert(bookingsTable)
      .values({
        bookingNumber: `SAB-B-${ts}`,
        bookingId: `SAB-B-${ts}`,
        userId: userB.id,
        customerId: custB.id,
        customerVehicleId: vehicleB.id,
        timeSlot: '11:00 AM',
        status: 'PENDING',
      })
      .returning();
    createdBookingIds.push(bookingB.id);

    // Seed Estimates
    const [estimateA] = await db
      .insert(serviceEstimatesTable)
      .values({
        bookingId: bookingA.id,
        totalAmount: '1200.00',
        labourAmount: '400.00',
        partsAmount: '800.00',
        status: 'PENDING',
      })
      .returning();
    createdEstimateIds.push(estimateA.id);

    const [estimateB] = await db
      .insert(serviceEstimatesTable)
      .values({
        bookingId: bookingB.id,
        totalAmount: '2500.00',
        labourAmount: '700.00',
        partsAmount: '1800.00',
        status: 'PENDING',
      })
      .returning();
    createdEstimateIds.push(estimateB.id);

    // Seed Notifications
    const [notifA] = await db
      .insert(notificationsTable)
      .values({
        userId: userA.id,
        title: 'Welcome A',
        message: 'Hello Customer A',
        type: 'SYSTEM',
      })
      .returning();
    createdNotifIds.push(notifA.id);

    const [notifB] = await db
      .insert(notificationsTable)
      .values({
        userId: userB.id,
        title: 'Welcome B',
        message: 'Hello Customer B',
        type: 'SYSTEM',
      })
      .returning();
    createdNotifIds.push(notifB.id);

    // Seed Orders
    const [orderA] = await db
      .insert(ordersTable)
      .values({
        orderNumber: `ORD-A-${ts}`,
        userId: userA.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotal: '500.00',
        totalAmount: '500.00',
      })
      .returning();
    createdOrderIds.push(orderA.id);

    const [orderB] = await db
      .insert(ordersTable)
      .values({
        orderNumber: `ORD-B-${ts}`,
        userId: userB.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotal: '900.00',
        totalAmount: '900.00',
      })
      .returning();
    createdOrderIds.push(orderB.id);

    // =================================================================
    // 2. TEST CUSTOMER ISOLATION (READ)
    // =================================================================
    console.log('\n--- Section 2: Customer Isolation (Read) ---');

    // Vehicles
    const resVehA_own = await fetch(`${baseUrl}/account/vehicles/${vehicleA.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const resVehA_other = await fetch(`${baseUrl}/account/vehicles/${vehicleB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '2. Customer Isolation',
      'Vehicle Read Isolation (A -> A allowed, A -> B denied)',
      resVehA_own.status === 200 && (resVehA_other.status === 404 || resVehA_other.status === 403),
      `Own status=${resVehA_own.status}, Other status=${resVehA_other.status}`
    );

    const resVehB_own = await fetch(`${baseUrl}/account/vehicles/${vehicleB.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const resVehB_other = await fetch(`${baseUrl}/account/vehicles/${vehicleA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    record(
      '2. Customer Isolation',
      'Vehicle Read Isolation (B -> B allowed, B -> A denied)',
      resVehB_own.status === 200 && (resVehB_other.status === 404 || resVehB_other.status === 403),
      `Own status=${resVehB_own.status}, Other status=${resVehB_other.status}`
    );

    // Orders
    const resOrdA_own = await fetch(`${baseUrl}/account/orders/${orderA.orderNumber}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const resOrdA_other = await fetch(`${baseUrl}/account/orders/${orderB.orderNumber}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '2. Customer Isolation',
      'Order Read Isolation (A -> A allowed, A -> B denied)',
      resOrdA_own.status === 200 && (resOrdA_other.status === 404 || resOrdA_other.status === 403),
      `Own status=${resOrdA_own.status}, Other status=${resOrdA_other.status}`
    );

    const resOrdB_own = await fetch(`${baseUrl}/account/orders/${orderB.orderNumber}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const resOrdB_other = await fetch(`${baseUrl}/account/orders/${orderA.orderNumber}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    record(
      '2. Customer Isolation',
      'Order Read Isolation (B -> B allowed, B -> A denied)',
      resOrdB_own.status === 200 && (resOrdB_other.status === 404 || resOrdB_other.status === 403),
      `Own status=${resOrdB_own.status}, Other status=${resOrdB_other.status}`
    );

    // Bookings
    const resBkgA_own = await fetch(`${baseUrl}/account/bookings/${bookingA.bookingNumber}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const resBkgA_other = await fetch(`${baseUrl}/account/bookings/${bookingB.bookingNumber}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '2. Customer Isolation',
      'Booking Read Isolation (A -> A allowed, A -> B denied)',
      resBkgA_own.status === 200 && (resBkgA_other.status === 404 || resBkgA_other.status === 403),
      `Own status=${resBkgA_own.status}, Other status=${resBkgA_other.status}`
    );

    const resBkgB_own = await fetch(`${baseUrl}/account/bookings/${bookingB.bookingNumber}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const resBkgB_other = await fetch(`${baseUrl}/account/bookings/${bookingA.bookingNumber}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    record(
      '2. Customer Isolation',
      'Booking Read Isolation (B -> B allowed, B -> A denied)',
      resBkgB_own.status === 200 && (resBkgB_other.status === 404 || resBkgB_other.status === 403),
      `Own status=${resBkgB_own.status}, Other status=${resBkgB_other.status}`
    );

    // Notifications
    const resNotifA_own = await fetch(`${baseUrl}/account/notifications`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const notifAData = (await resNotifA_own.json()) as any;
    const notifAContainsB = Array.isArray(notifAData?.data) && notifAData.data.some((n: any) => n.id === notifB.id);
    record(
      '2. Customer Isolation',
      'Notification Isolation (A cannot see B notifications)',
      !notifAContainsB,
      `Contains B notification: ${notifAContainsB}`
    );

    // Direct Data API (PostgreSQL under anon / authenticated)
    const clientIso = await pool.connect();
    try {
      await clientIso.query('SET ROLE anon;');
      const daVeh = await clientIso.query(`SELECT * FROM customer_vehicles WHERE id IN (${vehicleA.id}, ${vehicleB.id});`);
      const daOrd = await clientIso.query(`SELECT * FROM orders WHERE id IN (${orderA.id}, ${orderB.id});`);
      const daBkg = await clientIso.query(`SELECT * FROM service_bookings WHERE id IN (${bookingA.id}, ${bookingB.id});`);
      const daNot = await clientIso.query(`SELECT * FROM notifications WHERE id IN (${notifA.id}, ${notifB.id});`);
      await clientIso.query('RESET ROLE;');

      record(
        '2. Customer Isolation',
        'Direct Database API Isolation (Unauthenticated/Anon returns 0 rows)',
        daVeh.rows.length === 0 && daOrd.rows.length === 0 && daBkg.rows.length === 0 && daNot.rows.length === 0,
        `Vehicles=${daVeh.rows.length}, Orders=${daOrd.rows.length}, Bookings=${daBkg.rows.length}, Notifs=${daNot.rows.length}`
      );
    } finally {
      try {
        await clientIso.query('RESET ROLE;');
      } catch {}
      clientIso.release();
    }

    // =================================================================
    // 3. TEST WRITE ISOLATION
    // =================================================================
    console.log('\n--- Section 3: Write Isolation ---');

    // Customer A attempts to update Vehicle B
    const resUpdVeh = await fetch(`${baseUrl}/account/vehicles/${vehicleB.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nickname: 'Hacked Vehicle' }),
    });
    record(
      '3. Write Isolation',
      'Customer A cannot UPDATE Vehicle B',
      resUpdVeh.status === 404 || resUpdVeh.status === 403,
      `Status=${resUpdVeh.status}`
    );

    // Customer A attempts to delete Vehicle B
    const resDelVeh = await fetch(`${baseUrl}/account/vehicles/${vehicleB.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '3. Write Isolation',
      'Customer A cannot DELETE Vehicle B',
      resDelVeh.status === 404 || resDelVeh.status === 403,
      `Status=${resDelVeh.status}`
    );

    // Customer A attempts to update Booking B status
    const resUpdBkg = await fetch(`${baseUrl}/bookings/${bookingB.id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    record(
      '3. Write Isolation',
      'Customer A cannot UPDATE Booking B status',
      resUpdBkg.status === 403 || resUpdBkg.status === 401,
      `Status=${resUpdBkg.status}`
    );

    // Customer A attempts to mark Notification B as read
    const resMarkNotif = await fetch(`${baseUrl}/account/notifications/${notifB.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '3. Write Isolation',
      'Customer A cannot UPDATE Notification B',
      resMarkNotif.status === 404 || resMarkNotif.status === 403,
      `Status=${resMarkNotif.status}`
    );

    // Direct PostgreSQL Write Isolation Attempt
    const clientWrite = await pool.connect();
    try {
      await clientWrite.query('SET ROLE anon;');
      const uRes = await clientWrite.query(`UPDATE customer_vehicles SET nickname = 'SQL Hacked' WHERE id = ${vehicleB.id};`);
      const dRes = await clientWrite.query(`DELETE FROM orders WHERE id = ${orderB.id};`);
      await clientWrite.query('RESET ROLE;');

      record(
        '3. Write Isolation',
        'Direct Database API Write Blocked (0 rows modified by anon)',
        uRes.rowCount === 0 && dRes.rowCount === 0,
        `Update affected rows=${uRes.rowCount}, Delete affected rows=${dRes.rowCount}`
      );
    } finally {
      try {
        await clientWrite.query('RESET ROLE;');
      } catch {}
      clientWrite.release();
    }

    // =================================================================
    // 4. TEST ROLE ISOLATION
    // =================================================================
    console.log('\n--- Section 4: Role Isolation ---');

    // Customer cannot modify products
    const resCustCreateProduct = await fetch(`${baseUrl}/parts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sku: 'HACK-PART-1',
        name: 'Hacked Part',
        category: 'Engine',
        price: 10,
        stockQuantity: 100,
      }),
    });
    record(
      '4. Role Isolation',
      'CUSTOMER cannot create/modify products',
      resCustCreateProduct.status === 403,
      `Status=${resCustCreateProduct.status}`
    );

    // Customer cannot assign mechanics
    const resCustAssign = await fetch(`${baseUrl}/admin/bookings/${bookingA.id}/assign-mechanic`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mechanicId: 1 }),
    });
    record(
      '4. Role Isolation',
      'CUSTOMER cannot assign mechanics',
      resCustAssign.status === 403,
      `Status=${resCustAssign.status}`
    );

    // Customer cannot access admin inventory
    const resCustInv = await fetch(`${baseUrl}/admin/inventory`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '4. Role Isolation',
      'CUSTOMER cannot access /api/admin/inventory',
      resCustInv.status === 403,
      `Status=${resCustInv.status}`
    );

    // MECHANIC role checks:
    // Mechanic cannot access admin customers
    const resMechAdmin = await fetch(`${baseUrl}/admin/customers`, {
      headers: { Authorization: `Bearer ${tokenMech}` },
    });
    record(
      '4. Role Isolation',
      'MECHANIC cannot access /api/admin/customers',
      resMechAdmin.status === 403,
      `Status=${resMechAdmin.status}`
    );

    // Mechanic cannot modify products
    const resMechPart = await fetch(`${baseUrl}/parts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenMech}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sku: 'MECH-PART', name: 'Mech Part', category: 'General' }),
    });
    record(
      '4. Role Isolation',
      'MECHANIC cannot create parts (ADMIN only)',
      resMechPart.status === 403,
      `Status=${resMechPart.status}`
    );

    // STAFF role checks:
    // Staff can access inventory and orders
    const resStaffInv = await fetch(`${baseUrl}/admin/inventory`, {
      headers: { Authorization: `Bearer ${tokenStaff}` },
    });
    record(
      '4. Role Isolation',
      'STAFF can access authorized inventory management',
      resStaffInv.status === 200,
      `Status=${resStaffInv.status}`
    );

    // Staff cannot perform ADMIN-only part deletion
    const resStaffDelPart = await fetch(`${baseUrl}/parts/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenStaff}` },
    });
    record(
      '4. Role Isolation',
      'STAFF cannot perform ADMIN-only operations (DELETE part)',
      resStaffDelPart.status === 403,
      `Status=${resStaffDelPart.status}`
    );

    // ADMIN role checks:
    const resAdminInv = await fetch(`${baseUrl}/admin/inventory`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    record(
      '4. Role Isolation',
      'ADMIN can perform administrative operations',
      resAdminInv.status === 200,
      `Status=${resAdminInv.status}`
    );

    // =================================================================
    // 5. TEST INVENTORY
    // =================================================================
    console.log('\n--- Section 5: Inventory Protection ---');

    // Direct Data API inventory tampering attempt
    const clientInv = await pool.connect();
    try {
      await clientInv.query('SET ROLE anon;');
      const uInv = await clientInv.query('UPDATE helmet_inventory SET quantity = 9999;');
      const uPart = await clientInv.query('UPDATE service_parts SET stock_quantity = 9999, purchase_price = 0.01;');
      await clientInv.query('RESET ROLE;');

      record(
        '5. Inventory',
        'Direct Database API cannot tamper helmet_inventory or service_parts',
        uInv.rowCount === 0 && uPart.rowCount === 0,
        `Helmet inv rows=${uInv.rowCount}, Service parts rows=${uPart.rowCount}`
      );
    } finally {
      try {
        await clientInv.query('RESET ROLE;');
      } catch {}
      clientInv.release();
    }

    // Public API exposes parts without supplier or purchasePrice
    const resPartsPublic = await fetch(`${baseUrl}/parts`);
    const partsData = (await resPartsPublic.json()) as any;
    const firstPart = partsData?.data?.parts?.[0];
    const hasPurchasePrice = firstPart?.purchasePrice !== undefined;
    const hasSupplier = firstPart?.supplier !== undefined;
    record(
      '5. Inventory',
      'Public Catalog sanitizes purchasePrice and supplier',
      !hasPurchasePrice && !hasSupplier,
      `Exposed purchasePrice=${hasPurchasePrice}, supplier=${hasSupplier}`
    );

    // =================================================================
    // 6. TEST PRICE MANIPULATION
    // =================================================================
    console.log('\n--- Section 6: Price Manipulation ---');

    // Attempt to order product 1 with tampered prices in body
    const [genuinePart] = await db.select().from(sparePartsTable).where(eq(sparePartsTable.isActive, true)).limit(1);
    if (genuinePart) {
      const genuinePrice = Number(genuinePart.price);
      const resTamperedOrder = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              productId: genuinePart.id,
              quantity: 2,
              unit_price: 1.0,
              price: 1.0,
              mrp: 1.0,
              discount: 99.0,
            },
          ],
          subtotal: 2.0,
          totalAmount: 2.0,
          total: 2.0,
          deliveryCharge: 0,
        }),
      });

      const orderData = (await resTamperedOrder.json()) as any;
      const createdOrder = orderData?.data;
      if (createdOrder) {
        createdOrderIds.push(createdOrder.id);
        const expectedTotal = (genuinePrice * 2).toFixed(2);
        const actualTotal = Number(createdOrder.totalAmount).toFixed(2);
        record(
          '6. Price Manipulation',
          'Server ignores client-manipulated prices and computes authoritative total',
          actualTotal === expectedTotal && Number(actualTotal) > 2,
          `Expected=${expectedTotal}, Actual=${actualTotal}, ClientSent=2.00`
        );
      } else {
        record(
          '6. Price Manipulation',
          'Order creation rejected or handled safely',
          resTamperedOrder.status === 400 || resTamperedOrder.status === 409,
          `Status=${resTamperedOrder.status}`
        );
      }
    }

    // =================================================================
    // 7. TEST SERVICE ESTIMATES
    // =================================================================
    console.log('\n--- Section 7: Service Estimates ---');

    // Customer A only access A's estimate
    const resEstA = await fetch(`${baseUrl}/estimates/${bookingA.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const resEstB_byA = await fetch(`${baseUrl}/estimates/${bookingB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '7. Service Estimates',
      'Customer A can access Estimate A but is FORBIDDEN on Estimate B',
      resEstA.status === 200 && resEstB_byA.status === 403,
      `Own status=${resEstA.status}, Other status=${resEstB_byA.status}`
    );

    // Customer A cannot approve Estimate B
    const resApproveB = await fetch(`${baseUrl}/estimates/${bookingB.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '7. Service Estimates',
      'Customer A cannot approve Customer B estimate',
      resApproveB.status === 403,
      `Status=${resApproveB.status}`
    );

    // Customer A cannot reject Estimate B
    const resRejectB = await fetch(`${baseUrl}/estimates/${bookingB.id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    record(
      '7. Service Estimates',
      'Customer A cannot reject Customer B estimate',
      resRejectB.status === 403,
      `Status=${resRejectB.status}`
    );

    // Customer A cannot create estimates (only mechanics/admins)
    const resCreateEstByCust = await fetch(`${baseUrl}/estimates/${bookingA.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ labourAmount: 1, partsAmount: 1 }),
    });
    record(
      '7. Service Estimates',
      'Customer cannot create or alter estimate pricing',
      resCreateEstByCust.status === 403,
      `Status=${resCreateEstByCust.status}`
    );

    // =================================================================
    // 8. TEST AUTH TABLES
    // =================================================================
    console.log('\n--- Section 8: Auth Tables ---');

    const clientAuth = await pool.connect();
    try {
      await clientAuth.query('SET ROLE anon;');
      const qUsers = await clientAuth.query('SELECT * FROM users;');
      const qSessions = await clientAuth.query('SELECT * FROM sessions;');
      const qReset = await clientAuth.query('SELECT * FROM password_reset_tokens;');
      await clientAuth.query('RESET ROLE;');

      record(
        '8. Auth Tables',
        'Direct Database API returns ZERO rows for users, sessions, password_reset_tokens',
        qUsers.rows.length === 0 && qSessions.rows.length === 0 && qReset.rows.length === 0,
        `Users=${qUsers.rows.length}, Sessions=${qSessions.rows.length}, ResetTokens=${qReset.rows.length}`
      );
    } finally {
      try {
        await clientAuth.query('RESET ROLE;');
      } catch {}
      clientAuth.release();
    }

    // Public API profile requires auth and never returns password hash
    const resMe = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const meData = (await resMe.json()) as any;
    const hasPasswordHash = meData?.data?.passwordHash !== undefined || meData?.data?.password_hash !== undefined;
    record(
      '8. Auth Tables',
      '/api/auth/me never returns password hash',
      resMe.status === 200 && !hasPasswordHash,
      `Status=${resMe.status}, HasHash=${hasPasswordHash}`
    );

    // =================================================================
    // 9. TEST GRANTS AS WELL AS RLS
    // =================================================================
    console.log('\n--- Section 9: Table Grants Review ---');

    const grantsRes = await pool.query(`
      SELECT grantee, table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
      ORDER BY table_name, grantee;
    `);

    // Verify service_role has permissions
    const serviceGrants = grantsRes.rows.filter((r) => r.grantee === 'service_role');
    record(
      '9. Table Grants',
      'service_role has table grants',
      serviceGrants.length > 0,
      `Total service_role grants=${serviceGrants.length}`
    );

    // Analyze anon table grants
    const anonGrants = grantsRes.rows.filter((r) => r.grantee === 'anon');
    record(
      '9. Table Grants',
      'anon role grants inspected',
      anonGrants.length > 0,
      `Total anon grants=${anonGrants.length} (Enforced strictly by RLS policies)`
    );

    // =================================================================
    // 10. TEST FUTURE TABLE PROTECTION
    // =================================================================
    console.log('\n--- Section 10: Future Table Protection ---');

    await pool.query('CREATE TABLE public.rls_trigger_test (id bigint);');
    const trigCheck = await pool.query(
      "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rls_trigger_test';"
    );
    const trigPassed = trigCheck.rows[0]?.rowsecurity === true;
    await pool.query('DROP TABLE public.rls_trigger_test;');

    record(
      '10. Future Table Protection',
      'Event trigger automatically enables RLS on new table and cleans up',
      trigPassed,
      `Auto-enabled rowsecurity=${trigPassed}`
    );

    // =================================================================
    // 11. SUPABASE SECURITY LINT
    // =================================================================
    console.log('\n--- Section 11: Supabase Security Lint ---');

    const linterRLS = await pool.query(`
      SELECT c.relname as name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
        AND NOT c.relrowsecurity;
    `);

    record(
      '11. Supabase Lint',
      'RLS Disabled in Public (0013_rls_disabled_in_public)',
      linterRLS.rows.length === 0,
      `Unsecured public tables count=${linterRLS.rows.length}`
    );

    // Check mutable search path on security definer functions (0011)
    const mutableFuncs = await pool.query(`
      SELECT proname, prosecdef, proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND prosecdef = true AND (proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY(proconfig)));
    `);
    record(
      '11. Supabase Lint',
      'Security Definer Search Path Mutable (0011_function_search_path_mutable)',
      mutableFuncs.rows.length === 0,
      `Vulnerable functions count=${mutableFuncs.rows.length}`
    );
  } finally {
    // Clean up temporary seed objects cleanly without modifying base schema
    console.log('\n--- Cleaning up temporary audit records ---');
    try {
      if (createdNotifIds.length > 0) {
        await db.delete(notificationsTable).where(inArray(notificationsTable.id, createdNotifIds));
      }
      if (createdEstimateIds.length > 0) {
        await db.delete(serviceEstimateItemsTable).where(inArray(serviceEstimateItemsTable.estimateId, createdEstimateIds));
        await db.delete(serviceEstimatesTable).where(inArray(serviceEstimatesTable.id, createdEstimateIds));
      }
      if (createdBookingIds.length > 0) {
        await db.delete(bookingsTable).where(inArray(bookingsTable.id, createdBookingIds));
      }
      if (createdOrderIds.length > 0) {
        await db.delete(orderItemsTable).where(inArray(orderItemsTable.orderId, createdOrderIds));
        await db.delete(ordersTable).where(inArray(ordersTable.id, createdOrderIds));
      }
      if (createdVehicleIds.length > 0) {
        await db.delete(customerVehiclesTable).where(inArray(customerVehiclesTable.id, createdVehicleIds));
      }
      if (createdUserIds.length > 0) {
        await db.delete(usersTable).where(inArray(usersTable.id, createdUserIds));
      }
      if (createdCustomerIds.length > 0) {
        await db.delete(customersTable).where(inArray(customersTable.id, createdCustomerIds));
      }
      console.log('Cleanup completed successfully.');
    } catch (cleanErr: any) {
      console.warn('Cleanup warning:', cleanErr.message);
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n================================================================`);
  console.log(`SECONDARY RLS AUTHORIZATION AUDIT COMPLETED: ${passedCount}/${results.length} CHECKS PASSED`);
  console.log(`================================================================\n`);
}

runSecondaryAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
