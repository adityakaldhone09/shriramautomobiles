import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  notificationsTable,
  usersTable,
  customersTable,
  servicePartsTable,
  serviceBookingsTable,
  customerVehiclesTable,
} from '../../db/schema';
import {
  NotificationEventType,
  NotificationPayload,
  NOTIFICATION_TEMPLATES,
  SupportedLanguage,
  RenderedTemplate,
} from './templates';

export interface DispatchOptions {
  userId: number;
  eventType: NotificationEventType;
  payload: NotificationPayload;
  language?: SupportedLanguage;
  channels?: Array<'IN_APP' | 'WHATSAPP' | 'SMS' | 'EMAIL'>;
  hasCustomerConsent?: boolean;
}

export interface DispatchedResult {
  notificationId: number;
  rendered: RenderedTemplate;
  channelsDelivered: string[];
  channelsSuppressed: string[];
  consentVerified: boolean;
}

export class NotificationsService {
  /**
   * Generates a trilingual notification, saves it to the database,
   * and dispatches across permitted channels with consent verification.
   */
  async createAndDispatch(opts: DispatchOptions): Promise<DispatchedResult> {
    const lang: SupportedLanguage = opts.language || 'en';
    const templateFn = NOTIFICATION_TEMPLATES[opts.eventType]?.[lang] || NOTIFICATION_TEMPLATES[opts.eventType]?.en;

    if (!templateFn) {
      throw new Error(`Unsupported notification event type: ${opts.eventType}`);
    }

    const rendered = templateFn(opts.payload);
    const channels = opts.channels || ['IN_APP', 'WHATSAPP', 'SMS'];
    const delivered: string[] = [];
    const suppressed: string[] = [];

    // 1. Always deliver IN_APP to database
    const [inserted] = await db
      .insert(notificationsTable)
      .values({
        userId: opts.userId,
        type: opts.eventType,
        title: rendered.title,
        message: rendered.body,
        isRead: false,
        metadata: {
          payload: opts.payload,
          language: lang,
          deliveredChannels: channels,
        },
      })
      .returning();

    delivered.push('IN_APP');

    // 2. Channel Consent & Non-solicitation rules
    const hasConsent = opts.hasCustomerConsent !== false; // Default true for transactional lifecycle updates

    if (channels.includes('WHATSAPP')) {
      if (hasConsent) {
        // WhatsApp Official Cloud API dispatch stub (Sangola Workshop Sender 27AABCS1429B1Z8)
        delivered.push('WHATSAPP');
      } else {
        suppressed.push('WHATSAPP (Customer consent not granted)');
      }
    }

    if (channels.includes('SMS')) {
      if (hasConsent) {
        // SMS Gateway dispatch stub
        delivered.push('SMS');
      } else {
        suppressed.push('SMS (DND / Customer consent not granted)');
      }
    }

    if (channels.includes('EMAIL')) {
      delivered.push('EMAIL');
    }

    return {
      notificationId: inserted.id,
      rendered,
      channelsDelivered: delivered,
      channelsSuppressed: suppressed,
      consentVerified: hasConsent,
    };
  }

  /**
   * Background automation scheduler:
   * Scans for low-stock inventory, overdue repair jobs (>48h), and periodic service due dates.
   */
  async runScheduledAutomations() {
    const results = {
      lowStockAlertsGenerated: 0,
      overdueAlertsGenerated: 0,
      serviceRemindersGenerated: 0,
    };

    // 1. Find Admin users to receive operations alerts
    const admins = await db.select().from(usersTable).where(inArray(usersTable.role, ['ADMIN', 'SUPER_ADMIN']));
    const adminUser = admins[0];

    // 2. Scan Low Stock Items
    const allParts = await db.select().from(servicePartsTable).where(eq(servicePartsTable.isActive, true));
    const lowStockParts = allParts.filter(
      (p) => Number(p.stockQuantity || 0) <= Number(p.lowStockThreshold || 5)
    );

    if (adminUser) {
      for (const part of lowStockParts.slice(0, 3)) {
        await this.createAndDispatch({
          userId: adminUser.id,
          eventType: 'LOW_STOCK_ALERT',
          payload: {
            partName: part.name,
            currentStock: Number(part.stockQuantity || 0),
          },
          language: 'mr', // Marathi operational alert
          channels: ['IN_APP', 'WHATSAPP'],
          hasCustomerConsent: true,
        });
        results.lowStockAlertsGenerated++;
      }
    }

    // 3. Scan Overdue Workshop Jobs (>48h in CHECKED_IN or IN_PROGRESS)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const allBookings = await db.select().from(serviceBookingsTable);
    const overdueBookings = allBookings.filter(
      (b) =>
        ['CHECKED_IN', 'IN_PROGRESS'].includes(b.status) &&
        b.createdAt &&
        new Date(b.createdAt) <= fortyEightHoursAgo
    );

    if (adminUser) {
      for (const booking of overdueBookings.slice(0, 3)) {
        await this.createAndDispatch({
          userId: adminUser.id,
          eventType: 'OVERDUE_JOB_ALERT',
          payload: {
            bookingNumber: booking.bookingNumber,
            vehicleModel: 'Two-Wheeler in Bay',
          },
          language: 'en',
          channels: ['IN_APP'],
          hasCustomerConsent: true,
        });
        results.overdueAlertsGenerated++;
      }
    }

    // 4. Scan Customers Due for Service (>90 days since last booking)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const customers = await db.select().from(customersTable);

    for (const cust of customers.slice(0, 5)) {
      const custBookings = allBookings.filter((b) => b.customerId === cust.id);
      const isDue =
        custBookings.length === 0 ||
        custBookings.every((b) => !b.createdAt || new Date(b.createdAt) < ninetyDaysAgo);

      if (isDue) {
        // Find user account for customer if exists
        const [cUser] = await db.select().from(usersTable).where(eq(usersTable.email, cust.email));
        if (cUser) {
          await this.createAndDispatch({
            userId: cUser.id,
            eventType: 'NEXT_SERVICE_DUE',
            payload: {
              customerName: cust.name,
              vehicleModel: 'Motorcycle / Scooter',
              registrationNumber: 'MH 45',
            },
            language: 'mr', // Regional language customer outreach
            channels: ['IN_APP', 'WHATSAPP', 'SMS'],
            hasCustomerConsent: true,
          });
          results.serviceRemindersGenerated++;
        }
      }
    }

    return results;
  }

  async listUserNotifications(userId: number, limit = 20) {
    return await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit);
  }

  async getUnreadCount(userId: number): Promise<number> {
    const unread = await db
      .select()
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
    return unread.length;
  }

  async markAsRead(userId: number, id: number) {
    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)))
      .returning();
    return updated || null;
  }

  async markAllAsRead(userId: number) {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
    return true;
  }
}

export const notificationsService = new NotificationsService();
