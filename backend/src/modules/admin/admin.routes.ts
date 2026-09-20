import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN', 'STAFF'));
adminRouter.get('/customers', (req, res) => adminController.listCustomers(req, res));
adminRouter.get('/inventory', (req, res) => adminController.listInventory(req, res));
adminRouter.get('/inventory/low-stock', (req, res) => adminController.listLowStock(req, res));
adminRouter.patch('/orders/:id/status', (req, res) => adminController.updateOrderStatus(req, res));
adminRouter.post('/bookings/:id/assign-mechanic', (req, res) => adminController.assignMechanic(req, res));
