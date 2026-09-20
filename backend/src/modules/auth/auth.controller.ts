import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { createResponse, isValidEmail, isValidPhone } from '../../utils/helpers';
import { createToken, getAuthUser, readToken } from '../../middleware/auth';

const publicUser = (user: any) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  role: user.role,
});

export class AuthController {
  async register(req: Request, res: Response) {
    const { name, phone, email, password } = req.body;
    if (!name?.trim() || !isValidPhone(phone || '') || !isValidEmail(email || '') || !password || password.length < 8) {
      return res.status(400).json(createResponse(false, 'Name, valid phone, email and an 8-character password are required', undefined, 'VALIDATION_ERROR'));
    }

    try {
      const user = await authService.register({ name, phone, email, password });
      res.cookie('shriram_session', createToken(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return res.status(201).json(createResponse(true, 'Account created', { user: publicUser(user) }));
    } catch (err: any) {
      return res.status(400).json(createResponse(false, err.message || 'Registration failed', undefined, 'CONFLICT'));
    }
  }

  async login(req: Request, res: Response) {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json(createResponse(false, 'Phone or email and password are required', undefined, 'VALIDATION_ERROR'));
    }

    try {
      const user = await authService.login({ identifier, password });
      res.cookie('shriram_session', createToken(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return res.json(createResponse(true, 'Login successful', { user: publicUser(user) }));
    } catch (err: any) {
      return res.status(401).json(createResponse(false, err.message || 'Invalid credentials', undefined, 'UNAUTHORIZED'));
    }
  }

  logout(_req: Request, res: Response) {
    res.clearCookie('shriram_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return res.json(createResponse(true, 'Logged out'));
  }

  async refresh(req: Request, res: Response) {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ')
      ? header.slice(7)
      : (req as Request & { cookies?: Record<string, string> }).cookies?.shriram_session;

    if (!token) return res.status(401).json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));

    const identity = readToken(token);
    if (!identity) return res.status(401).json(createResponse(false, 'Session expired', undefined, 'UNAUTHORIZED'));

    const user = await authService.getUserById(identity.id);
    if (!user) return res.status(401).json(createResponse(false, 'Session expired', undefined, 'UNAUTHORIZED'));

    res.cookie('shriram_session', createToken(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return res.json(createResponse(true, 'Session refreshed', { user: publicUser(user) }));
  }

  async forgotPassword(req: Request, res: Response) {
    const email = String(req.body.email || '');
    await authService.createPasswordResetToken(email);
    return res.json(createResponse(true, 'If an account exists, reset instructions will be sent shortly'));
  }

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body;
    if (!token || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json(createResponse(false, 'A valid token and 8-character password are required', undefined, 'VALIDATION_ERROR'));
    }

    try {
      await authService.resetPassword(token, password);
      return res.json(createResponse(true, 'Password reset successfully'));
    } catch (err: any) {
      return res.status(400).json(createResponse(false, err.message || 'Reset failed', undefined, 'INVALID_RESET_TOKEN'));
    }
  }

  async me(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const user = await authService.getUserById(auth.id);
    if (!user) return res.status(404).json(createResponse(false, 'User not found', undefined, 'NOT_FOUND'));
    return res.json(createResponse(true, 'Account fetched', publicUser(user)));
  }
}

export const authController = new AuthController();
