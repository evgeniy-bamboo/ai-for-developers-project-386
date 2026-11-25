import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { healthCheckOptions } from "./generated/@tanstack/react-query.gen.ts";
import { client } from "./generated/client.gen.ts";

test("SDK calls the API under /api", () => {
  assert.equal(client.buildUrl({ url: "/health" }), "/api/health");
});

test("query options fetch through the SDK", async () => {
  const urls: string[] = [];
  const options = healthCheckOptions({
    // Node.js cannot request relative URLs.
    baseUrl: "http://localhost/api",
    fetch: async (input) => {
      urls.push(new Request(input).url);
      return Response.json({ status: "ok" });
    },
  });

  const health = await new QueryClient().fetchQuery({ ...options, gcTime: 0 });

  assert.deepEqual(health, { status: "ok" });
  assert.deepEqual(urls, ["http://localhost/api/health"]);
});
