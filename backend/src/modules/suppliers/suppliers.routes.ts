import { Router } from 'express';
import { suppliersController } from './suppliers.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const suppliersRouter = Router();

suppliersRouter.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => suppliersController.listSuppliers(req, res));
suppliersRouter.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => suppliersController.createSupplier(req, res));
suppliersRouter.get('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => suppliersController.getSupplier(req, res));
suppliersRouter.put('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => suppliersController.updateSupplier(req, res));

