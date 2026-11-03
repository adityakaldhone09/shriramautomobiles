/**
 * PHASE 7 INTEGRATION TEST SUITE: AUTOMATION, TRILINGUAL NOTIFICATIONS & CUSTOMER CONSENT
 * Tests trilingual message templates (EN / HI / MR), customer consent enforcement,
 * multi-channel dispatch (In-App, WhatsApp, SMS stubs), and automated scheduled checks.
 */

import http from 'node:http';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';
import { createToken, hashPassword } from '../../backend/src/middleware/auth';
import { db, ensureDbInitialized } from '../../backend/src/db/client';
import { usersTable } from '../../backend/src/db/schema/users';
import { NOTIFICATION_TEMPLATES } from '../../backend/src/modules/notifications/templates';
import { notificationsService } from '../../backend/src/modules/notifications/notifications.service';

const server = http.createServer(app);

let port: number;
let baseUrl: string;

let adminToken: string;
let customerToken: string;
let customerUser: any;

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
  const [admin] = await db
    .insert(usersTable)
    .values({
      name: 'Workshop Operations Lead',
      phone: `98660${String(ts).slice(-5)}`,
      email: `phase7-admin-${ts}@shriram.test`,
      passwordHash: hashPassword('AdminPass123!'),
      role: 'ADMIN',
    })
    .returning();
  adminToken = createToken(admin);

  // 2. Ensure Customer User
  const [cust] = await db
    .insert(usersTable)
    .values({
      name: 'Rajesh Shinde',
      phone: `98661${String(ts).slice(-5)}`,
      email: `phase7-cust-${ts}@shriram.test`,
      passwordHash: hashPassword('CustPass123!'),
      role: 'CUSTOMER',
    })
    .returning();
  customerUser = cust;
  customerToken = createToken(cust);
}

async function teardown() {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log('\n====================================================');
console.log('RUNNING PHASE 7: AUTOMATION & TRILINGUAL NOTIFICATIONS');
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

      // TEST 1: Trilingual Templates Render Correctly in English, Hindi, and Marathi
      {
        const payload = {
          customerName: 'Rajesh Shinde',
          vehicleModel: 'Hero Splendor Plus',
          registrationNumber: 'MH 45 AF 1234',
          bookingNumber: 'BK-2026-0099',
          amount: 2450,
          invoiceNumber: 'INV-2026-0042',
        };

        const enBooking = NOTIFICATION_TEMPLATES.BOOKING_CONFIRMED.en(payload);
        const hiBooking = NOTIFICATION_TEMPLATES.BOOKING_CONFIRMED.hi(payload);
        const mrBooking = NOTIFICATION_TEMPLATES.BOOKING_CONFIRMED.mr(payload);

        assert.ok(enBooking.body.includes('confirmed at Shriram Automobiles'));
        assert.ok(hiBooking.body.includes('श्रीराम ऑटोमोबाइल्स'));
        assert.ok(mrBooking.body.includes('श्रीराम ऑटोमोबाईल्स'));
        assert.ok(mrBooking.whatsAppText.includes('कडलास नाका, सांगोला'));

        const mrInvoice = NOTIFICATION_TEMPLATES.INVOICE_GENERATED.mr(payload);
        assert.ok(mrInvoice.body.includes('पावती क्रमांक'));
        assert.ok(mrInvoice.whatsAppText.includes('27AABCS1429B1Z8'));

        console.log('  [PASS] Trilingual templates verified in English, Hindi, and Marathi with Sangola workshop credentials');
      }

      // TEST 2: Multi-Channel Dispatch with Customer Consent
      {
        const res = await fetch(`${baseUrl}/notifications/dispatch-test`, {
          method: 'POST',
          headers: customerHeaders,
          body: JSON.stringify({
            eventType: 'BOOKING_CONFIRMED',
            language: 'mr',
            channels: ['IN_APP', 'WHATSAPP', 'SMS'],
            hasCustomerConsent: true,
          }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.channelsDelivered.includes('IN_APP'));
        assert.ok(json.data.channelsDelivered.includes('WHATSAPP'));
        assert.ok(json.data.channelsDelivered.includes('SMS'));
        assert.strictEqual(json.data.channelsSuppressed.length, 0);
        assert.strictEqual(json.data.consentVerified, true);
        console.log('  [PASS] Multi-channel notification successfully dispatched across In-App, WhatsApp, and SMS with consent');
      }

      // TEST 3: Customer Consent Enforcement & Suppression of Unsolicited Channels
      {
        const res = await fetch(`${baseUrl}/notifications/dispatch-test`, {
          method: 'POST',
          headers: customerHeaders,
          body: JSON.stringify({
            eventType: 'SERVICE_COMPLETED',
            language: 'en',
            channels: ['IN_APP', 'WHATSAPP', 'SMS'],
            hasCustomerConsent: false, // Consent revoked / DND active
          }),
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok(json.data.channelsDelivered.includes('IN_APP'), 'In-app notification must always be preserved');
        assert.ok(!json.data.channelsDelivered.includes('WHATSAPP'), 'WhatsApp must be suppressed without consent');
        assert.ok(!json.data.channelsDelivered.includes('SMS'), 'SMS must be suppressed without consent');
        assert.ok(json.data.channelsSuppressed.some((s: string) => s.includes('consent not granted')));
        console.log('  [PASS] Non-solicitation rule strictly verified: External channels suppressed without explicit customer consent');
      }

      // TEST 4: Customer Lists and Reads Notifications
      {
        const listRes = await fetch(`${baseUrl}/notifications`, {
          headers: customerHeaders,
        });
        const listJson = await listRes.json();
        assert.strictEqual(listRes.status, 200);
        assert.ok(Array.isArray(listJson.data));
        assert.ok(listJson.data.length >= 2);

        const unreadRes = await fetch(`${baseUrl}/notifications/unread-count`, {
          headers: customerHeaders,
        });
        const unreadJson = await unreadRes.json();
        assert.strictEqual(unreadRes.status, 200);
        assert.ok(unreadJson.data.unreadCount >= 2);

        const firstNotif = listJson.data[0];
        const readRes = await fetch(`${baseUrl}/notifications/${firstNotif.id}/read`, {
          method: 'PATCH',
          headers: customerHeaders,
        });
        const readJson = await readRes.json();
        assert.strictEqual(readRes.status, 200);
        assert.strictEqual(readJson.data.isRead, true);

        // Mark all as read
        const markAllRes = await fetch(`${baseUrl}/notifications/read-all`, {
          method: 'PATCH',
          headers: customerHeaders,
        });
        assert.strictEqual(markAllRes.status, 200);

        const verifyUnread = await fetch(`${baseUrl}/notifications/unread-count`, {
          headers: customerHeaders,
        });
        const verifyJson = await verifyUnread.json();
        assert.strictEqual(verifyJson.data.unreadCount, 0);

        console.log('  [PASS] Notification lifecycle: List, unread counting, mark as read, and bulk read operations');
      }

      // TEST 5: Automated Scheduled Checks Execution (Admin Automation)
      {
        const res = await fetch(`${baseUrl}/notifications/run-automation`, {
          method: 'POST',
          headers: adminHeaders,
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.success, true);
        assert.ok('lowStockAlertsGenerated' in json.data);
        assert.ok('overdueAlertsGenerated' in json.data);
        assert.ok('serviceRemindersGenerated' in json.data);
        console.log('  [PASS] Background automation job successfully executed scheduled scans for low stock and service reminders');
      }

      // TEST 6: Role Security & Vertical Privilege Isolation
      {
        // Regular customer cannot run automated checks -> 403 Forbidden
        const resCust = await fetch(`${baseUrl}/notifications/run-automation`, {
          method: 'POST',
          headers: customerHeaders,
        });
        assert.strictEqual(resCust.status, 403);

        // Unauthenticated request -> 401 Unauthorized
        const resUnauth = await fetch(`${baseUrl}/notifications`);
        assert.strictEqual(resUnauth.status, 401);

        console.log('  [PASS] Role Protection: Regular customers strictly prohibited from executing system automations (403)');
      }

      console.log('\n====================================================');
      console.log('ALL 6/6 PHASE 7 AUTOMATION TESTS PASSED!');
      console.log('====================================================\n');

      await teardown();
      process.exit(0);
    } catch (err) {
      console.error('\n[FAIL] Phase 7 Test Failed:', err);
      await teardown();
      process.exit(1);
    }
  })
  .catch(async (err) => {
    console.error('Phase 7 setup error:', err);
    await teardown();
    process.exit(1);
  });
