import { Router, type IRouter } from 'express';
import { createOrder, listOrders } from '../controllers/orderController';
import { requireAuth } from '../middlewares/auth';

const router: IRouter = Router();
router.use('/orders', requireAuth);
router.get('/orders', listOrders);
router.post('/orders', createOrder);
export default router;
