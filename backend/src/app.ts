import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyServerOptions } from "fastify";
import { fastifyOpenapiGlue } from "fastify-openapi-glue";
import { healthCheck } from "./controllers/health.ts";
import type { RouteHandlers } from "./generated/fastify.gen.ts";

const specification = join(import.meta.dirname, "../../spec/openapi.yaml");

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  const serviceHandlers: RouteHandlers = { healthCheck };

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      code: "not_found",
      message: `Route not found`,
    }),
  );
  app.register(fastifyOpenapiGlue, { specification, serviceHandlers });

  return app;
}
