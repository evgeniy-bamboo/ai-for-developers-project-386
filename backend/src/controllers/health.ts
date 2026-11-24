import type { RouteHandlers } from "../generated/fastify.gen.ts";

export const healthCheck: RouteHandlers["healthCheck"] = async (_request, reply) =>
  reply.code(200).send({ status: "ok" });
