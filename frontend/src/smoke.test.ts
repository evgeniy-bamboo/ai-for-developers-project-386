import assert from "node:assert/strict";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";

let server: ViteDevServer;
let baseUrl: string;

before(async () => {
  server = await createServer({
    root: join(import.meta.dirname, ".."),
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(typeof address === "object" && address !== null);
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(() => server.close());

for (const path of ["/", "/book", "/admin"]) {
  test(`serves the app at ${path}`, async () => {
    const response = await fetch(`${baseUrl}${path}`);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="root"/);
  });
}

test("serves the entry module", async () => {
  const response = await fetch(`${baseUrl}/src/main.tsx`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /javascript/);
});
