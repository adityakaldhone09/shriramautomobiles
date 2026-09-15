import { Router } from 'express';
import { cartController } from './cart.controller';
import { requireAuth } from '../../middleware/auth';

export const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get('/', (req, res) => cartController.getCart(req, res));
cartRouter.post('/items', (req, res) => cartController.addCartItem(req, res));
cartRouter.patch('/items/:id', (req, res) => cartController.updateCartItem(req, res));
cartRouter.delete('/items/:id', (req, res) => cartController.deleteCartItem(req, res));
