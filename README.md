# Call Calendar

[![hexlet-check](https://github.com/evgeniy-bamboo/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/evgeniy-bamboo/ai-for-developers-project-386/actions)

Simplified cal.com: guests book calls with a single admin. No registration or authentication; the admin page is open to anyone.

[Hexlet](https://ru.hexlet.io/programs/ai-for-developers) study project. [Demo of expected behavior](https://files.hexlet.app/a/2ipc5m).

## User flows

### Guest: book a call

1. First page lists the enabled slot durations. Guest picks one.
2. Calendar opens. Only dates with available slots are selectable; all others are disabled. Guest picks a date.
3. Available slots for that date are shown. Guest clicks one.
4. Form: email (required), name (required), notes (optional). Guest confirms.
5. Confirmation screen. On error: `slot_taken` or `invalid_slot` → show it and refresh the slots; `duration_disabled` → show it and return to the first page; `invalid_input` → show it in the form; anything else, including network failure → show a generic error and keep the form.

### Admin

"Admin" link in the footer → single page with both sections below.

- **Upcoming events**: events that have not ended, earliest first: guest email, name, notes, booked slot (start and duration), created date and time.
- **Durations**: toggle the durations offered to guests: 15m, 30m, 45m, 1h.

## Business rules

- Working hours: Mon–Fri 09:00–18:00 wall-clock time in `ADMIN_TZ` (env, IANA name, default `UTC`), so they follow DST. Invalid `ADMIN_TZ` → the backend fails to start.
- Slots start every 15 minutes and must end within working hours.
- A slot is available only if it overlaps no booking of any duration. Back-to-back is allowed.
- Booking window: tomorrow through +14 days, by calendar date in `ADMIN_TZ`. Only the backend computes it, so guests in other time zones may be offered slots on their local today.
- Slots are requested by duration and a UTC range `[from, to)`, matched on slot start. The backend returns only bookable slots.
- The calendar requests `[now, now + 16 days)` and groups slots by the guest's local date. It has no window or working-hours logic of its own.
- All durations are enabled by default. Disabling one blocks new bookings only; existing ones stay. If none is enabled, the first page says so.
- The backend re-validates every booking: input, duration, window, working hours, slot grid, overlap.
- API dates are ISO 8601 UTC. UI shows the browser's local time.

### Input limits

- Email: valid format, up to 254 characters.
- Name: 1–100 characters, not blank.
- Notes: up to 1000 characters; blank = omitted.
- Limits apply as sent; values are then trimmed before saving.

### Errors

Error body: `{ code, message }`. Checks run in table order.

| Status | `code` | When |
| --- | --- | --- |
| 400 | `invalid_input` | Malformed request, unknown duration, input limits, `from` not before `to` |
| 422 | `duration_disabled` | Duration is turned off (booking or listing slots) |
| 422 | `invalid_slot` | Outside the booking window or working hours, or off the slot grid |
| 409 | `slot_taken` | Overlaps an existing booking |

Outside these checks: unknown route → 404 `not_found`; unexpected failure → 500 `internal_error`.

## Technical requirements

Node.js 24+, npm workspaces, TypeScript 6.x (stable `@hey-api/openapi-ts` fails on 7), ESM.

```
spec/      TypeSpec → openapi.yaml
backend/   Fastify API
frontend/  React + shadcn/ui SPA
```

### API contract

- TypeSpec in `spec/` is the only source of truth. Change it first.
- `openapi.yaml` is generated and committed; never edit it by hand.
- `fastify-openapi-glue` registers routes and validation from `openapi.yaml`; `operationId` = controller method. No hand-written routes.
- Every operation sets an explicit camelCase `@operationId`, e.g. `bookingsCreate`. The default `Bookings_create` does not match the generated handler names.
- `@hey-api/openapi-ts` generates code from `openapi.yaml`; it is committed, never edited by hand:
  - frontend: client SDK (fetch client, types) and TanStack Query options;
  - backend: API types and `RouteHandlers` (`fastify` plugin). No other code.
- The frontend calls the API only through the generated SDK. No hand-written `fetch` or API types.

### TypeScript

- `tsc --noEmit` is for type checking only.
- Use `import type`.
- Erasable syntax only (`erasableSyntaxOnly`): no enums, runtime namespaces, parameter properties or decorators. JSX is allowed in `frontend/` only.
- Backend: no transpile/bundle step; Node.js runs `.ts` directly. Use `.ts` import extensions.
- Frontend: Vite bundles. Modules tested with `node:test` contain no JSX and use relative imports with `.ts` extensions, not the `@/` alias.

### Testing

- Node.js built-ins only: `node --test`, `node:test` (including `mock`), `node:assert/strict`. No third-party test runners, assertion or mocking libraries.
- Frontend: unit tests cover pure logic (e.g. grouping slots by local date). No component tests.

### Backend

- Controller → use case → repository interface.
- Controllers only map HTTP to use cases. No business logic.
- Controllers are typed as the generated `RouteHandlers` and reply with `reply.code(status).send(body)`; returning the body directly fails type checking.
- One use case per file. No Fastify imports; repositories and clock are injected.
- Storage is in-memory behind repository interfaces; data is lost on restart.
- Custom Fastify error and not-found handlers produce every error body. Fastify's own 4xx errors (schema validation, broken JSON, etc.) → 400 `invalid_input`.
- The booking repository checks overlap and inserts as one atomic operation.
- Every use case has unit tests.

### Frontend

- Separate process; talks to the backend only through the HTTP API.
- React, Vite, Tailwind CSS, shadcn/ui. Client-rendered SPA: no server rendering.
- Build UI from shadcn/ui components. They live in `frontend/src/components/ui/`, are added with the shadcn CLI and may be edited.
- Server state: TanStack Query with the generated options. No other state library.
- Generated SDK uses `baseUrl: "/api"`. Spec paths and backend routes have no `/api` prefix.
- Development: Vite dev server proxies `/api/*` to the backend, stripping `/api`.
- Production: `vite build`, then a small Node.js server serves `dist/` (unknown non-API paths → `index.html`) and proxies `/api/*` the same way.

## Constraints

Do not edit, rename or delete `.github/workflows/hexlet-check.yml`. Do not rename the repository.
