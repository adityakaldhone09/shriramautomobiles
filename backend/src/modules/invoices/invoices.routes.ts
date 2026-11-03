import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const invoicesRouter = Router();

invoicesRouter.get('/', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => invoicesController.listInvoices(req, res));
invoicesRouter.get('/:id', requireAuth, (req, res) => invoicesController.getInvoice(req, res));
invoicesRouter.post('/generate-from-booking', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => invoicesController.generateFromBooking(req, res));
invoicesRouter.post('/direct-sale', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => invoicesController.createDirectSale(req, res));
invoicesRouter.post('/:id/payment', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => invoicesController.recordPayment(req, res));
