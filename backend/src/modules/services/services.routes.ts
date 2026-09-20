import { Router } from 'express';
import { servicesController } from './services.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const servicesRouter = Router();

servicesRouter.get('/', (req, res) => servicesController.getServices(req, res));
servicesRouter.get('/symptoms', (req, res) => servicesController.getSymptoms(req, res));
servicesRouter.get('/:id', (req, res) => servicesController.getServiceById(req, res));
servicesRouter.post('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => servicesController.createService(req, res));
servicesRouter.put('/:id', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => servicesController.updateService(req, res));
servicesRouter.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res) => servicesController.deleteService(req, res));
