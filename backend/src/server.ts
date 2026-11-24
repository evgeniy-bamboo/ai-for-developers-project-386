import { buildApp } from "./app.ts";

const app = buildApp({ logger: true });

await app.listen({ port: Number(process.env.PORT ?? 3000) });
