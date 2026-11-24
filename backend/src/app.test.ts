import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { buildApp } from "./app.ts";

const app = buildApp();
let baseUrl: string;

before(async () => {
  baseUrl = await app.listen({ port: 0 });
});

after(() => app.close());

test("GET /health reports ok", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("unknown route returns not_found", async () => {
  const response = await fetch(`${baseUrl}/unknown`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    code: "not_found",
    message: "Route not found",
  });
});
