import { Router, type IRouter } from 'express';
import { assignMechanic, listCustomers, listInventory, listLowStock, updateOrderStatus } from '../controllers/adminController';
import { requireAuth, requireRole } from '../middlewares/auth';

const router: IRouter = Router();
router.use('/admin', requireAuth, requireRole('ADMIN', 'STAFF'));
router.get('/admin/customers', listCustomers);
router.get('/admin/inventory', listInventory);
router.get('/admin/inventory/low-stock', listLowStock);
router.put('/admin/orders/:id/status', updateOrderStatus);
router.put('/admin/bookings/:id/mechanic', assignMechanic);
export default router;
