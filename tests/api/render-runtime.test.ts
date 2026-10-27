import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../../backend/src/app';

const frontendDistPath = await mkdtemp(path.join(os.tmpdir(), 'shriram-render-test-'));
const assetDirectory = path.join(frontendDistPath, 'assets');
await mkdir(assetDirectory);
await writeFile(
  path.join(frontendDistPath, 'index.html'),
  '<!doctype html><html><body>render-test-index</body></html>'
);
await writeFile(path.join(assetDirectory, 'app-hash.js'), 'render-test-asset');

const server = createApp({ frontendDistPath }).listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const homeResponse = await fetch(`${baseUrl}/`, { headers: { Accept: 'text/html' } });
  assert.equal(homeResponse.status, 200);
  assert.match(await homeResponse.text(), /render-test-index/);
  assert.match(homeResponse.headers.get('cache-control') || '', /max-age=0/);

  const nestedRouteResponse = await fetch(`${baseUrl}/bookings/new`, {
    headers: { Accept: 'text/html' },
  });
  assert.equal(nestedRouteResponse.status, 200);
  assert.match(await nestedRouteResponse.text(), /render-test-index/);

  const assetResponse = await fetch(`${baseUrl}/assets/app-hash.js`, {
    headers: { Accept: 'text/javascript' },
  });
  assert.equal(assetResponse.status, 200);
  assert.equal(await assetResponse.text(), 'render-test-asset');
  assert.match(assetResponse.headers.get('cache-control') || '', /immutable/);

  const missingAssetResponse = await fetch(`${baseUrl}/assets/missing.js`, {
    headers: { Accept: 'text/javascript' },
  });
  assert.equal(missingAssetResponse.status, 404);
  assert.doesNotMatch(await missingAssetResponse.text(), /render-test-index/);

  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200);
    assert.match(healthResponse.headers.get('content-security-policy') || '', /script-src 'self'/);
    assert.equal(healthResponse.headers.get('x-powered-by'), null);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }

  const unknownApiResponse = await fetch(`${baseUrl}/api/not-a-route`, {
    headers: { Accept: 'text/html' },
  });
  assert.equal(unknownApiResponse.status, 404);
  assert.match(unknownApiResponse.headers.get('content-type') || '', /application\/json/);
  const unknownApiBody = await unknownApiResponse.json();
  assert.equal(unknownApiBody.error, 'NOT_FOUND');
  assert.doesNotMatch(JSON.stringify(unknownApiBody), /render-test-index/);

  console.log('[PASS] Render static assets, SPA fallback, and API 404 behavior.');
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(frontendDistPath, { recursive: true, force: true });
}
