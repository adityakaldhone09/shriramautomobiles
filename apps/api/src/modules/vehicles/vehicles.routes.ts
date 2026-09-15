import { Router } from 'express';
import { vehiclesController } from './vehicles.controller';
import { requireAuth } from '../../middleware/auth';

export const vehiclesRouter = Router();

vehiclesRouter.get('/brands', (req, res) => vehiclesController.listBrands(req, res));
vehiclesRouter.get('/models', (req, res) => vehiclesController.listModels(req, res));
vehiclesRouter.get('/my', requireAuth, (req, res) => vehiclesController.listMyVehicles(req, res));
vehiclesRouter.post('/my', requireAuth, (req, res) => vehiclesController.createMyVehicle(req, res));
