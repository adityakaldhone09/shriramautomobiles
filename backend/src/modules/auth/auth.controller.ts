import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { createResponse, isValidEmail, isValidPhone } from '../../utils/helpers';
import { createToken, extractAuthToken, getAuthUser, readToken } from '../../middleware/auth';
import { logger } from '../../utils/logger';

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
    if (
      !name?.trim() ||
      !isValidPhone(phone || '') ||
      !isValidEmail(email || '') ||
      !password ||
      password.length < 8
    ) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            'Name, valid phone, email and an 8-character password are required',
            undefined,
            'VALIDATION_ERROR'
          )
        );
    }

    try {
      const user = await authService.register({ name, phone, email, password });
      res.cookie('shriram_session', createToken(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return res
        .status(201)
        .json(createResponse(true, 'Account created', { user: publicUser(user) }));
    } catch (error) {
      if (
        error instanceof Error &&
        [
          'An account already exists for this phone number',
          'An account already exists for this email address',
        ].includes(error.message)
      ) {
        return res.status(409).json(createResponse(false, error.message, undefined, 'CONFLICT'));
      }
      logger.error('Account registration failed');
      return res
        .status(500)
        .json(createResponse(false, 'Registration failed', undefined, 'INTERNAL_SERVER_ERROR'));
    }
  }

  async login(req: Request, res: Response) {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            'Phone or email and password are required',
            undefined,
            'VALIDATION_ERROR'
          )
        );
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
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid login details') {
        return res
          .status(401)
          .json(createResponse(false, 'Invalid login details', undefined, 'UNAUTHORIZED'));
      }
      logger.error('Authentication request failed');
      return res
        .status(500)
        .json(createResponse(false, 'Authentication failed', undefined, 'INTERNAL_SERVER_ERROR'));
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
    const token = extractAuthToken(req);

    if (!token)
      return res
        .status(401)
        .json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));

    const identity = readToken(token);
    if (!identity)
      return res
        .status(401)
        .json(createResponse(false, 'Session expired', undefined, 'UNAUTHORIZED'));

    try {
      const user = await authService.getUserById(identity.id);
      if (!user) {
        return res
          .status(401)
          .json(createResponse(false, 'Session expired', undefined, 'UNAUTHORIZED'));
      }

      res.cookie('shriram_session', createToken(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return res.json(createResponse(true, 'Session refreshed', { user: publicUser(user) }));
    } catch {
      logger.error('Session refresh failed');
      return res
        .status(500)
        .json(createResponse(false, 'Session refresh failed', undefined, 'INTERNAL_SERVER_ERROR'));
    }
  }

  async forgotPassword(req: Request, res: Response) {
    const email = String(req.body.email || '');
    try {
      await authService.createPasswordResetToken(email);
      return res.json(
        createResponse(true, 'If an account exists, reset instructions will be sent shortly')
      );
    } catch {
      logger.error('Password reset request failed');
      return res
        .status(500)
        .json(
          createResponse(false, 'Password reset request failed', undefined, 'INTERNAL_SERVER_ERROR')
        );
    }
  }

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body;
    if (!token || typeof password !== 'string' || password.length < 8) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            'A valid token and 8-character password are required',
            undefined,
            'VALIDATION_ERROR'
          )
        );
    }

    try {
      await authService.resetPassword(token, password);
      return res.json(createResponse(true, 'Password reset successfully'));
    } catch (error) {
      if (error instanceof Error && error.message === 'Reset token is invalid or expired') {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              'Reset token is invalid or expired',
              undefined,
              'INVALID_RESET_TOKEN'
            )
          );
      }
      logger.error('Password reset failed');
      return res
        .status(500)
        .json(createResponse(false, 'Password reset failed', undefined, 'INTERNAL_SERVER_ERROR'));
    }
  }

  async me(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const user = await authService.getUserById(auth.id);
    if (!user)
      return res.status(404).json(createResponse(false, 'User not found', undefined, 'NOT_FOUND'));
    return res.json(createResponse(true, 'Account fetched', publicUser(user)));
  }
}

export const authController = new AuthController();
