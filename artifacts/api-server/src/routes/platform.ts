import { Router, type IRouter } from 'express';
import { createWholesaleQuote, listNotifications, listWholesaleQuotes, markNotificationRead } from '../controllers/platformController';
import { requireAuth, requireRole } from '../middlewares/auth';

const router: IRouter = Router();
router.get('/account/notifications', requireAuth, listNotifications);
router.put('/account/notifications/:id/read', requireAuth, markNotificationRead);
router.post('/wholesale/quotes', createWholesaleQuote);
router.get('/admin/wholesale/quotes', requireAuth, requireRole('ADMIN', 'STAFF'), listWholesaleQuotes);
export default router;
