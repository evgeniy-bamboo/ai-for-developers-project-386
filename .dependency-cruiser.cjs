/** Architecture rules from README.md. @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true, dependencyTypesNot: ["type-only"] },
    },
    {
      name: "no-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-undeclared-dependency",
      comment: "Declare the package in package.json.",
      severity: "error",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "no-dev-dependency-in-production-code",
      severity: "error",
      from: { path: "^backend/src", pathNot: "[.]test[.]ts$" },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
    },
    {
      name: "frontend-not-to-backend",
      comment: "The frontend talks to the backend only through the HTTP API.",
      severity: "error",
      from: { path: "^frontend/" },
      to: { path: "^(backend|spec)/" },
    },
    {
      name: "backend-not-to-frontend",
      severity: "error",
      from: { path: "^backend/" },
      to: { path: "^frontend/" },
    },
    {
      name: "use-cases-without-http",
      comment: "Use cases do not import Fastify, controllers or the app.",
      severity: "error",
      from: { path: "^backend/src/use-cases/" },
      to: {
        path: "node_modules/(fastify|@fastify/)|^backend/src/generated/fastify|^backend/src/(controllers/|app[.]ts|server[.]ts)",
      },
    },
    {
      name: "use-cases-without-implementations",
      comment: "Repositories are injected: use cases import interfaces as types only.",
      severity: "error",
      from: { path: "^backend/src/use-cases/", pathNot: "[.]test[.]ts$" },
      to: { path: "^backend/src/repositories/", dependencyTypesNot: ["type-only"] },
    },
    {
      name: "controllers-through-use-cases",
      comment: "Controllers map HTTP to use cases and do not touch repositories.",
      severity: "error",
      from: { path: "^backend/src/controllers/" },
      to: { path: "^backend/src/repositories/" },
    },
    {
      name: "repositories-without-upper-layers",
      severity: "error",
      from: { path: "^backend/src/repositories/" },
      to: {
        path: "node_modules/(fastify|@fastify/)|^backend/src/generated/fastify|^backend/src/(controllers/|use-cases/|app[.]ts|server[.]ts)",
      },
    },
    {
      name: "domain-is-independent",
      comment: "Shared types, errors and pure logic: no imports from other layers.",
      severity: "error",
      from: { path: "^backend/src/domain/" },
      to: {
        path: "node_modules/(fastify|@fastify/)|^backend/src/generated/fastify|^backend/src/(controllers/|use-cases/|repositories/|app[.]ts|server[.]ts)",
      },
    },
    {
      name: "known-backend-folders",
      comment: "The rules above match folder names. Add rules for a new folder before using it.",
      severity: "error",
      from: {},
      to: {
        path: "^backend/src/(?!(controllers|domain|generated|repositories|use-cases)/)[^/]+/",
      },
    },
    {
      name: "production-not-to-tests",
      severity: "error",
      from: { pathNot: "[.]test[.]ts$" },
      to: { path: "[.]test[.]ts$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    // Resolves the "@/" alias.
    tsConfig: { fileName: "frontend/tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js"],
    },
  },
};
