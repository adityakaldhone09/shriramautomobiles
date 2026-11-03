import { Router } from 'express';
import { purchaseOrdersController } from './purchase-orders.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => purchaseOrdersController.listPurchaseOrders(req, res));
purchaseOrdersRouter.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => purchaseOrdersController.createPurchaseOrder(req, res));
purchaseOrdersRouter.get('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => purchaseOrdersController.getPurchaseOrder(req, res));
purchaseOrdersRouter.post('/:id/receive', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => purchaseOrdersController.receivePurchaseOrder(req, res));
purchaseOrdersRouter.patch('/:id/status', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => purchaseOrdersController.updateStatus(req, res));
