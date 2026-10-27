import { Router, type Request, type RequestHandler, type Response } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';

export const authRouter = Router();

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void handler(req, res).catch(next);
  };

authRouter.post(
  '/register',
  authLimiter,
  asyncRoute((req, res) => authController.register(req, res))
);
authRouter.post(
  '/login',
  authLimiter,
  asyncRoute((req, res) => authController.login(req, res))
);
authRouter.post('/logout', (req, res) => authController.logout(req, res));
authRouter.post(
  '/refresh',
  asyncRoute((req, res) => authController.refresh(req, res))
);
authRouter.post(
  '/forgot-password',
  authLimiter,
  asyncRoute((req, res) => authController.forgotPassword(req, res))
);
authRouter.post(
  '/reset-password',
  authLimiter,
  asyncRoute((req, res) => authController.resetPassword(req, res))
);
authRouter.get(
  '/me',
  requireAuth,
  asyncRoute((req, res) => authController.me(req, res))
);
