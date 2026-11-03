/**
 * SHRIRAM AUTOMOBILES - PRODUCTION SMOKE TEST RUNNER
 * Usage:
 *   pnpm run test:smoke
 *   TARGET_URL=https://shriram-automobiles.onrender.com pnpm run test:smoke
 */

const targetUrl = (process.env.TARGET_URL || 'http://127.0.0.1:5001').replace(/\/+$/, '');
const isProduction = process.env.NODE_ENV === 'production' || targetUrl.includes('onrender.com') || targetUrl.includes('vercel.app');

interface CheckResult {
  name: string;
  url: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

const results: CheckResult[] = [];

async function checkEndpoint(
  name: string,
  endpoint: string,
  validator: (res: Response, json: any) => Promise<void> | void
) {
  const fullUrl = `${targetUrl}${endpoint}`;
  const start = Date.now();
  try {
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'ShriramAutomobiles-SmokeTest/1.0',
        'X-Client-Purpose': 'production-readiness-probe',
      },
    });
    const durationMs = Date.now() - start;

    let json: any = null;
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {}
    }

    await validator(res, json);
    results.push({ name, url: fullUrl, passed: true, durationMs });
    console.log(`  [PASS] ${name.padEnd(42)} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ name, url: fullUrl, passed: false, durationMs, details: err.message });
    console.error(`  [FAIL] ${name.padEnd(42)} (${durationMs}ms) -> ${err.message}`);
  }
}

async function runSmokeTests() {
  console.log('\n========================================================');
  console.log(`SHRIRAM AUTOMOBILES - SMOKE TEST TARGET: ${targetUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('========================================================\n');

  // 1. Health Probe
  await checkEndpoint('1. System Health & Database Ready', '/api/health', (res, json) => {
    if (res.status !== 200) throw new Error(`HTTP ${res.status} (expected 200)`);
    if (!json?.success) throw new Error(`Invalid health response payload: ${JSON.stringify(json)}`);
  });

  // 2. Request Correlation & Security Headers
  await checkEndpoint('2. Security & Tracing Headers', '/api/health', (res) => {
    const nosniff = res.headers.get('x-content-type-options');
    if (nosniff !== 'nosniff') throw new Error(`Missing or invalid X-Content-Type-Options: ${nosniff}`);
    const frame = res.headers.get('x-frame-options');
    if (!frame) throw new Error('Missing X-Frame-Options header');
    const reqId = res.headers.get('x-request-id');
    if (!reqId) throw new Error('Missing X-Request-Id correlation header');
  });

  // 3. Vehicles Brand Catalog
  await checkEndpoint('3. Public Vehicle Brand Catalog', '/api/vehicles/brands', (res, json) => {
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = json?.data || json;
    if (!Array.isArray(data) || data.length === 0) throw new Error('Brand catalog is empty');
  });

  // 4. Spare Parts Categories
  await checkEndpoint('4. Spare Parts Category Taxonomy', '/api/parts/categories', (res, json) => {
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = json?.data || json;
    if (!Array.isArray(data) || data.length === 0) throw new Error('Part categories are empty');
  });

  // 5. Helmet Catalog
  await checkEndpoint('5. ISI Certified Helmet Catalog', '/api/helmets', (res, json) => {
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = json?.data || json;
    if (!Array.isArray(data) || data.length === 0) throw new Error('Helmet catalog is empty');
  });

  // 6. AI Intelligence Microservice / Embedded Fallback
  await checkEndpoint('6. AI Intelligence Diagnostics', '/api/ai/health', (res, json) => {
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!json?.success || !Array.isArray(json?.data?.modules)) {
      throw new Error('AI diagnostics payload missing module list');
    }
  });

  // 7. Security IDOR Barrier for Anonymous Users
  await checkEndpoint('7. Anonymous Vertical Privilege Barrier', '/api/admin/overview', (res) => {
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401/403 for unauthenticated admin access, got ${res.status}`);
    }
  });

  console.log('\n========================================================');
  const allPassed = results.every((r) => r.passed);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  if (allPassed) {
    console.log(`ALL ${results.length}/${results.length} SMOKE CHECKS PASSED! (${totalDuration}ms total)`);
    console.log('Production target is operational, secure, and ready to serve.');
    console.log('========================================================\n');
    process.exit(0);
  } else {
    const failedCount = results.filter((r) => !r.passed).length;
    console.error(`SMOKE TEST FAILED: ${failedCount}/${results.length} checks failed.`);
    console.log('========================================================\n');
    process.exit(1);
  }
}

runSmokeTests();
