import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const inventoryRouter = Router();

// Read inventory is available to admin & staff
inventoryRouter.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => inventoryController.listInventory(req, res));
inventoryRouter.get('/movements', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => inventoryController.listMovements(req, res));

// Adjust stock is restricted to admin & staff
inventoryRouter.post('/adjust', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => inventoryController.adjustStock(req, res));
