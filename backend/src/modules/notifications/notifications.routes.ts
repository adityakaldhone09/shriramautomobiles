import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', (req, res) => notificationsController.listNotifications(req, res));
notificationsRouter.get('/unread-count', (req, res) => notificationsController.getUnreadCount(req, res));
notificationsRouter.patch('/read-all', (req, res) => notificationsController.markAllAsRead(req, res));
notificationsRouter.patch('/:id/read', (req, res) => notificationsController.markAsRead(req, res));
notificationsRouter.post('/dispatch-test', (req, res) => notificationsController.dispatchTestNotification(req, res));

// Admin-only automation triggers
notificationsRouter.post('/run-automation', requireRole('ADMIN', 'STAFF'), (req, res) =>
  notificationsController.runAutomatedChecks(req, res)
);
