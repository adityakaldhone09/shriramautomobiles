import type { Request, Response } from 'express';
import { and, eq, desc } from 'drizzle-orm';

import { db } from '../../db/client';
import { notificationsTable } from '../../db/schema';
import { createResponse } from '../../utils/helpers';
import { getAuthUser } from '../../middleware/auth';

export class NotificationsController {
  async listNotifications(req: Request, res: Response) {
    const user = getAuthUser(req);
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(desc(notificationsTable.createdAt));
    return res.json(createResponse(true, 'Notifications fetched', notifications));
  }

  async markAsRead(req: Request, res: Response) {
    const user = getAuthUser(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json(createResponse(false, 'Invalid notification ID', undefined, 'VALIDATION_ERROR'));
    }

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)))
      .returning();

    if (!updated) return res.status(404).json(createResponse(false, 'Notification not found or unauthorized', undefined, 'NOT_FOUND'));
    return res.json(createResponse(true, 'Notification marked as read', updated));
  }

}

export const notificationsController = new NotificationsController();
