import { Router } from 'express';
import { partsController } from './parts.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const partsRouter = Router();

partsRouter.get('/', (req, res) => partsController.getSpareParts(req, res));
partsRouter.get('/categories', (req, res) => partsController.getCategories(req, res));
partsRouter.get('/compatible/:vehicleId', (req, res) => partsController.getCompatibleParts(req, res));
partsRouter.get('/:id', (req, res) => partsController.getSparePartById(req, res));
partsRouter.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => partsController.createSparePart(req, res));
partsRouter.put('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => partsController.updateSparePart(req, res));
partsRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res) => partsController.deleteSparePart(req, res));
