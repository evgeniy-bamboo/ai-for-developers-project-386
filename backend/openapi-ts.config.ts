import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../spec/openapi.yaml",
  output: {
    path: "src/generated",
    module: { extension: ".ts" },
  },
  plugins: ["@hey-api/typescript", "fastify"],
});
