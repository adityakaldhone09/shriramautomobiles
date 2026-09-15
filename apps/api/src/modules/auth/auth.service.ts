import crypto from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { customersTable, passwordResetTokensTable, usersTable } from '../../db/schema';
import { hashPassword, verifyPassword } from '../../middleware/auth';
import type { RegisterDTO, LoginDTO } from './auth.types';

export class AuthService {
  async register(data: RegisterDTO) {
    const cleanPhone = data.phone.replace(/[\s\-+]/g, '');
    const cleanEmail = data.email.trim().toLowerCase();

    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, cleanPhone));
    if (existing.length) {
      throw new Error('An account already exists for this phone number');
    }

    const [customer] = await db.insert(customersTable).values({
      name: data.name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
    }).returning();

    const [user] = await db.insert(usersTable).values({
      customerId: customer.id,
      name: data.name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash: hashPassword(data.password),
    }).returning();

    return user;
  }

  async login(data: LoginDTO) {
    const isEmail = data.identifier.includes('@');
    const query = isEmail
      ? eq(usersTable.email, data.identifier.toLowerCase())
      : eq(usersTable.phone, data.identifier.replace(/[\s\-+]/g, ''));

    const [user] = await db.select().from(usersTable).where(query);
    if (!user || !verifyPassword(data.password, user.passwordHash)) {
      throw new Error('Invalid login details');
    }

    return user;
  }

  async getUserById(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user || null;
  }

  async createPasswordResetToken(email: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase()));
    if (!user) return null;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    });

    return rawToken;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [reset] = await db.select().from(passwordResetTokensTable).where(
      and(eq(passwordResetTokensTable.tokenHash, tokenHash), isNull(passwordResetTokensTable.usedAt))
    );

    if (!reset || reset.expiresAt < new Date()) {
      throw new Error('Reset token is invalid or expired');
    }

    await db.transaction(async (tx) => {
      await tx.update(usersTable).set({
        passwordHash: hashPassword(newPassword),
        updatedAt: new Date(),
      }).where(eq(usersTable.id, reset.userId));

      await tx.update(passwordResetTokensTable).set({
        usedAt: new Date(),
      }).where(eq(passwordResetTokensTable.id, reset.id));
    });

    return true;
  }
}

export const authService = new AuthService();
