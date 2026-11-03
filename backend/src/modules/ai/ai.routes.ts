import { Router } from 'express';
import { aiController } from './ai.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const aiRouter = Router();

// Health / status
aiRouter.get('/health', (req, res) => aiController.getHealth(req, res));

// Customer & staff accessible AI endpoints
aiRouter.post('/recommend/maintenance', requireAuth, (req, res) => aiController.recommendMaintenance(req, res));
aiRouter.post('/recommend/parts', requireAuth, (req, res) => aiController.recommendParts(req, res));
aiRouter.post('/predict/maintenance', requireAuth, (req, res) => aiController.predictMaintenance(req, res));

// Restricted to ADMIN & STAFF only
aiRouter.post('/forecast/inventory', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => aiController.forecastInventory(req, res));
aiRouter.post('/intelligence/customers', requireAuth, requireRole('ADMIN', 'STAFF'), (req, res) => aiController.analyzeCustomerIntelligence(req, res));
