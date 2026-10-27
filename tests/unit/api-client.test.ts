import assert from "node:assert/strict";
import { apiClient, apiUrl } from "../../frontend/src/services/api/client";

assert.equal(apiUrl("/auth/me?source=account"), "/api/auth/me?source=account");
assert.equal(apiUrl("/api/auth/me"), "/api/auth/me");
assert.equal(apiUrl("api/auth/me"), "/api/auth/me");

const originalFetch = globalThis.fetch;
let capturedInput: RequestInfo | URL | undefined;
let capturedInit: RequestInit | undefined;

try {
  globalThis.fetch = async (input, init) => {
    capturedInput = input;
    capturedInit = init;
    return new Response(JSON.stringify({ data: { authenticated: true } }), {
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await apiClient<{ authenticated: boolean }>(
    "/api/auth/me?source=account",
    {
      headers: { Authorization: "Bearer test-token" },
    },
  );

  assert.deepEqual(result, { authenticated: true });
  assert.equal(capturedInput, "/api/auth/me?source=account");
  assert.equal(capturedInit?.credentials, "include");
  assert.equal(
    new Headers(capturedInit?.headers).get("authorization"),
    "Bearer test-token",
  );

  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(
    await apiClient<void>("/auth/logout", { method: "POST" }),
    undefined,
  );

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  await assert.rejects(apiClient("/auth/me"), /Authentication required/);

  console.log(
    "[PASS] API client base URLs, queries, auth headers, cookies, empty responses, and errors.",
  );
} finally {
  globalThis.fetch = originalFetch;
}
