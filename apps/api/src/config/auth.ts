import { env } from './env';

export const authConfig = {
  secret: env.AUTH_SECRET,
  tokenExpiresIn: '7d',
};
