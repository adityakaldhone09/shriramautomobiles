import { Router } from 'express';
import { mechanicsController } from './mechanics.controller';

export const mechanicsRouter = Router();

mechanicsRouter.get('/', (req, res) => mechanicsController.getMechanics(req, res));
mechanicsRouter.get('/slots', (req, res) => mechanicsController.getAvailableSlots(req, res));
