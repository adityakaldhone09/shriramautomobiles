import { Router, type IRouter } from 'express';
import {
  recordInspection,
  createEstimate,
  getEstimate,
  approveEstimate,
  rejectEstimate,
  decideEstimate,
} from '../controllers/estimateController';
import { requireAuth, requireRole } from '../middlewares/auth';

const router: IRouter = Router();

// Mechanic Inspection
router.post('/admin/bookings/:id/inspection', requireAuth, requireRole('ADMIN', 'STAFF', 'MECHANIC'), recordInspection);

// Official Estimate Creation
router.post('/admin/bookings/:id/estimate', requireAuth, requireRole('ADMIN', 'STAFF'), createEstimate);

// Customer Estimate Access & Approval
router.get('/account/estimates/:id', requireAuth, getEstimate);
router.get('/account/bookings/:id/estimate', requireAuth, getEstimate);
router.put('/account/estimates/:id/approve', requireAuth, approveEstimate);
router.put('/account/estimates/:id/reject', requireAuth, rejectEstimate);
router.put('/account/estimates/:estimateId/:decision', requireAuth, decideEstimate);

export default router;
