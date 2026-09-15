import { Router } from 'express';
import { wholesaleController } from './wholesale.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const wholesaleRouter = Router();

wholesaleRouter.post('/quote', (req, res) => wholesaleController.submitQuote(req, res));
wholesaleRouter.get('/quotes', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => wholesaleController.listQuotes(req, res));
