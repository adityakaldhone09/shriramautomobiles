import { Router } from 'express';
import { estimatesController } from './estimates.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const estimatesRouter = Router();

estimatesRouter.get('/:bookingId', requireAuth, (req, res) => estimatesController.getEstimate(req, res));
estimatesRouter.post('/:bookingId', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), (req, res) => estimatesController.createEstimate(req, res));
estimatesRouter.post('/:bookingId/approve', requireAuth, (req, res) => estimatesController.approveEstimate(req, res));
estimatesRouter.put('/:bookingId/approve', requireAuth, (req, res) => estimatesController.approveEstimate(req, res));
estimatesRouter.post('/:bookingId/reject', requireAuth, (req, res) => estimatesController.rejectEstimate(req, res));
estimatesRouter.put('/:bookingId/reject', requireAuth, (req, res) => estimatesController.rejectEstimate(req, res));

