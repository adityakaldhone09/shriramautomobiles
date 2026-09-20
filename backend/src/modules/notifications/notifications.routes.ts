import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth } from '../../middleware/auth';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/', (req, res) => notificationsController.listNotifications(req, res));
notificationsRouter.patch('/:id/read', (req, res) => notificationsController.markAsRead(req, res));
