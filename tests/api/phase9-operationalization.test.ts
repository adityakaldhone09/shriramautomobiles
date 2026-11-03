/**
 * PHASE 9 INTEGRATION TEST SUITE: OPERATIONALIZATION, PWA & TRACEABILITY
 * Tests:
 * 1. Request correlation tracing (X-Request-Id auto-generation and client propagation)
 * 2. Mobile workshop camera permissions policy (camera=(self))
 * 3. PWA manifest structure and mobile installability parameters
 * 4. Production smoke test verification runner
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/app';

const server = http.createServer(app);

let port: number;
let baseUrl: string;

async function setup() {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n========================================================');
  console.log('RUNNING PHASE 9: OPERATIONALIZATION & TRACEABILITY TESTS');
  console.log('========================================================\n');

  // Test 1: X-Request-Id Auto-Generation
  {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const reqId = res.headers.get('x-request-id');
    assert.ok(reqId, 'X-Request-Id header must be present on response');
    assert.match(
      reqId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Auto-generated request ID must be a valid UUID'
    );
    console.log(`  [PASS] Auto-generated request correlation ID verified: ${reqId}`);
  }

  // Test 2: X-Request-Id Inbound Propagation
  {
    const customTraceId = 'shriram-trace-corr-998877';
    const res = await fetch(`${baseUrl}/health`, {
      headers: { 'X-Request-Id': customTraceId },
    });
    assert.strictEqual(res.status, 200);
    const echoedId = res.headers.get('x-request-id');
    assert.strictEqual(echoedId, customTraceId, 'Inbound X-Request-Id must be preserved across response headers');
    console.log(`  [PASS] Custom inbound request correlation ID propagated cleanly: ${echoedId}`);
  }

  // Test 3: Permissions-Policy Camera Access for Workshop Inspections
  {
    const res = await fetch(`${baseUrl}/health`);
    const policy = res.headers.get('permissions-policy');
    assert.ok(policy, 'Permissions-Policy header must be configured');
    assert.ok(policy.includes('camera=(self)'), 'Permissions policy must permit camera=(self) for shop floor photo uploads');
    console.log('  [PASS] Camera permissions verified for mechanic shop floor photo inspections');
  }

  // Test 4: PWA Web App Manifest Verification
  {
    const rootDir = path.resolve(import.meta.dirname, '..', '..');
    const manifestPath = path.resolve(rootDir, 'frontend', 'public', 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'frontend/public/manifest.json must exist');
    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(content.short_name, 'Shriram Auto');
    assert.strictEqual(content.display, 'standalone');
    assert.strictEqual(content.start_url, '/');
    assert.ok(content.icons && content.icons.length > 0, 'Manifest must declare application icons');
    console.log('  [PASS] PWA Web App Manifest verified for Android/iOS mechanic shop-floor installation');
  }

  // Test 5: PWA Link & Theme Tags in index.html
  {
    const rootDir = path.resolve(import.meta.dirname, '..', '..');
    const htmlPath = path.resolve(rootDir, 'frontend', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(htmlContent.includes('<link rel="manifest" href="/manifest.json" />'), 'index.html must link manifest.json');
    assert.ok(htmlContent.includes('<meta name="theme-color" content="#f97316" />'), 'index.html must declare theme-color');
    console.log('  [PASS] HTML PWA meta tags and manifest linkage verified in frontend/index.html');
  }

  console.log('\n========================================================');
  console.log('ALL 5/5 PHASE 9 OPERATIONALIZATION TESTS PASSED!');
  console.log('========================================================\n');
}

async function main() {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Phase 9 test failure:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

main();
