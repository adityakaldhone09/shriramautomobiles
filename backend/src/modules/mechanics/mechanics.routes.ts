import { Router } from 'express';
import { mechanicsController } from './mechanics.controller';
import { optionalAuth } from '../../middleware/auth';

export const mechanicsRouter = Router();

mechanicsRouter.get('/', optionalAuth, (req, res) => mechanicsController.getMechanics(req, res));
mechanicsRouter.get('/slots', (req, res) => mechanicsController.getAvailableSlots(req, res));

