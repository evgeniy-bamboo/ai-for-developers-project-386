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

Node.js 24+, npm workspaces, TypeScript 5.x (5.8+; `openapi-typescript` does not support later majors), ESM.

```
spec/      TypeSpec → openapi.yaml
backend/   Fastify API
frontend/  Vanilla TypeScript UI
```

### API contract

- TypeSpec in `spec/` is the only source of truth. Change it first.
- `openapi.yaml` is generated and committed; never edit it by hand.
- `fastify-openapi-glue` registers routes and validation from `openapi.yaml`; `operationId` = controller method. No hand-written routes.
- `openapi-typescript` generates API types from `openapi.yaml`; they are committed, never edited by hand. The frontend client is `openapi-fetch` with these types. No other API calls.

### TypeScript

- No transpile/bundle step; codegen only. Node.js runs `.ts` directly.
- Erasable syntax only (`erasableSyntaxOnly`): no enums, runtime namespaces, parameter properties, decorators or JSX.
- Use `import type` and `.ts` import extensions. `tsc --noEmit` is for type checking only.

### Testing

- Node.js built-ins only: `node --test`, `node:test` (including `mock`), `node:assert/strict`. No third-party test runners, assertion or mocking libraries.

### Backend

- Controller → use case → repository interface.
- Controllers only map HTTP to use cases. No business logic.
- One use case per file. No Fastify imports; repositories and clock are injected.
- Storage is in-memory behind repository interfaces; data is lost on restart.
- Custom Fastify error and not-found handlers produce every error body. Fastify's own 4xx errors (schema validation, broken JSON, etc.) → 400 `invalid_input`.
- The booking repository checks overlap and inserts as one atomic operation.
- Every use case has unit tests.

### Frontend

- Separate process; talks to the backend only through the HTTP API.
- No framework or bundler. A small Node.js server serves static files, strips types on the fly (`stripTypeScriptTypes` from `node:module`) and proxies `/api/*` to the backend, stripping `/api`. Spec paths and backend routes have no `/api` prefix.
- `openapi-fetch` is loaded via import map, with `baseUrl: "/api"`.

## Constraints

Do not edit, rename or delete `.github/workflows/hexlet-check.yml`. Do not rename the repository.
