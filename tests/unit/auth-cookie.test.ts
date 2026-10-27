import assert from 'node:assert/strict';
import type { Request } from 'express';
import { createToken, extractAuthToken, readToken } from '../../backend/src/middleware/auth';

const user = { id: 7, role: 'customer', phone: '5550100' };
const sessionToken = createToken(user);
const request = (authorization?: string, cookie?: string) =>
  ({
    header: (name: string) => {
      if (name.toLowerCase() === 'authorization') return authorization;
      if (name.toLowerCase() === 'cookie') return cookie;
      return undefined;
    },
  }) satisfies Pick<Request, 'header'>;

assert.equal(
  extractAuthToken(request(undefined, `theme=dark; shriram_session=${sessionToken}`)),
  sessionToken
);
const cookieUser = readToken(
  extractAuthToken(request(undefined, `shriram_session=${sessionToken}`)) || ''
);
assert.deepEqual({ id: cookieUser?.id, role: cookieUser?.role, phone: cookieUser?.phone }, user);
assert.equal(
  extractAuthToken(request('Bearer header-token', `shriram_session=${sessionToken}`)),
  'header-token'
);
assert.equal(extractAuthToken(request(undefined, 'not_shriram_session=wrong')), null);

console.log('[PASS] Signed session cookies and bearer auth are extracted consistently.');
