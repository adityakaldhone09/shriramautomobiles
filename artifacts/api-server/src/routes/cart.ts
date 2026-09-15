import { Router, type IRouter } from 'express';
import { addCartItem, deleteCartItem, getCart, updateCartItem } from '../controllers/cartController';
import { requireAuth } from '../middlewares/auth';

const router: IRouter = Router();
router.use('/cart', requireAuth);
router.get('/cart', getCart);
router.post('/cart/items', addCartItem);
router.put('/cart/items/:id', updateCartItem);
router.delete('/cart/items/:id', deleteCartItem);
export default router;
