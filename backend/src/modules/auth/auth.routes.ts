import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';

export const authRouter = Router();

authRouter.post('/register', authLimiter, (req, res) => authController.register(req, res));
authRouter.post('/login', authLimiter, (req, res) => authController.login(req, res));
authRouter.post('/logout', (req, res) => authController.logout(req, res));
authRouter.post('/refresh', (req, res) => authController.refresh(req, res));
authRouter.post('/forgot-password', authLimiter, (req, res) => authController.forgotPassword(req, res));
authRouter.post('/reset-password', authLimiter, (req, res) => authController.resetPassword(req, res));
authRouter.get('/me', requireAuth, (req, res) => authController.me(req, res));

