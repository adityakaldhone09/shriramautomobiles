import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.post('/logout', (req, res) => authController.logout(req, res));
authRouter.post('/refresh', (req, res) => authController.refresh(req, res));
authRouter.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
authRouter.post('/reset-password', (req, res) => authController.resetPassword(req, res));
authRouter.get('/me', requireAuth, (req, res) => authController.me(req, res));
