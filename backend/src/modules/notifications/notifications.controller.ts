import type { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { createResponse } from '../../utils/helpers';
import { getAuthUser } from '../../middleware/auth';

export class NotificationsController {
  async listNotifications(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
      const notifications = await notificationsService.listUserNotifications(user.id, limit);
      return res.json(createResponse(true, 'Notifications fetched', notifications));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to list notifications', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const count = await notificationsService.getUnreadCount(user.id);
      return res.json(createResponse(true, 'Unread notification count fetched', { unreadCount: count }));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to get unread count', undefined, 'INTERNAL_ERROR'));
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) {
        return res.status(400).json(createResponse(false, 'Invalid notification ID', undefined, 'VALIDATION_ERROR'));
      }

      const updated = await notificationsService.markAsRead(user.id, id);
      if (!updated) {
        return res.status(404).json(createResponse(false, 'Notification not found or unauthorized', undefined, 'NOT_FOUND'));
      }

      return res.json(createResponse(true, 'Notification marked as read', updated));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to mark notification as read', undefined, 'INTERNAL_ERROR'));
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      await notificationsService.markAllAsRead(user.id);
      return res.json(createResponse(true, 'All notifications marked as read'));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to mark all as read', undefined, 'INTERNAL_ERROR'));
    }
  }

  async dispatchTestNotification(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      const { eventType, payload, language, channels, hasCustomerConsent } = req.body;

      if (!eventType) {
        return res.status(400).json(createResponse(false, 'Missing required field: eventType is mandatory', undefined, 'BAD_REQUEST'));
      }

      const result = await notificationsService.createAndDispatch({
        userId: user.id,
        eventType,
        payload: payload || {
          customerName: (user as any).name || 'Valued Rider',
          vehicleModel: 'Hero Splendor Plus',
          registrationNumber: 'MH 45 AD 1234',
          bookingNumber: 'BK-SAMPLE-01',
        },
        language: language || 'mr',
        channels: channels || ['IN_APP', 'WHATSAPP', 'SMS'],
        hasCustomerConsent: hasCustomerConsent !== false,
      });

      return res.json(createResponse(true, 'Notification dispatched successfully', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to dispatch notification', undefined, 'INTERNAL_ERROR'));
    }
  }

  async runAutomatedChecks(_req: Request, res: Response) {
    try {
      const result = await notificationsService.runScheduledAutomations();
      return res.json(createResponse(true, 'Automated scheduled notification checks executed', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to run automation checks', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const notificationsController = new NotificationsController();
