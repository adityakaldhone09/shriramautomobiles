import { Router } from 'express';
import { ordersController } from './orders.controller';
import { requireAuth } from '../../middleware/auth';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.get('/', (req, res) => ordersController.listOrders(req, res));
ordersRouter.post('/', (req, res) => ordersController.createOrder(req, res));
