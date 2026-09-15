import { Router, type IRouter } from 'express';
import { forgotPassword, login, logout, me, refresh, register, resetPassword } from '../controllers/authController';
import { requireAuth } from '../middlewares/auth';

const router: IRouter = Router();
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.post('/auth/refresh', refresh);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.get('/auth/me', requireAuth, me);
export default router;
