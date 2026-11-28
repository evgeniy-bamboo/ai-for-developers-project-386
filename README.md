# Call Calendar

[![hexlet-check](https://github.com/evgeniy-bamboo/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/evgeniy-bamboo/ai-for-developers-project-386/actions)

Simplified cal.com: guests book calls with a single admin. No registration or authentication; the admin page is open to anyone.

[Hexlet](https://ru.hexlet.io/programs/ai-for-developers) study project. [Demo of expected behavior](https://files.hexlet.app/a/2ipc5m).

## User flows

| Path | Page |
| --- | --- |
| `/` | Home page: tells about the service. Static, no API calls. |
| `/book` | Booking page: all steps of booking a call |
| `/admin` | Admin page |
| other | "Page not found" |

Every page has a header (logo → home page, "Book a call" → booking page) and a footer ("Admin" → admin page).

### Guest: book a call

1. Home page leads to the booking page.
2. Booking page lists the event types (title, description, duration), by duration then title. Guest picks one.
3. Calendar opens. Only dates with available slots are selectable; all others are disabled. Guest picks a date.
4. Available slots for that date are shown. Guest clicks one.
5. Form: email (required), name (required), notes (optional). Guest confirms.
6. Confirmation screen. On error: `slot_taken` or `invalid_slot` → show it and refresh the slots; `event_type_not_found` → show it and return to the event types; `invalid_input` → show it in the form; anything else, including network failure → show a generic error and keep the form.

### Admin

Single page with both sections below.

- **Upcoming bookings**: bookings that have not ended, earliest first: event type title, guest email, name, notes, booked slot (start and duration), created date and time.
- **Event types**: list, create, edit and delete the event types offered to guests.

## Business rules

- Working hours: Mon–Fri 09:00–18:00 wall-clock time in `ADMIN_TZ` (env, IANA name, default `UTC`), so they follow DST. Invalid `ADMIN_TZ` → the backend fails to start.
- Slots start every 15 minutes and must end within working hours.
- A slot is available only if it overlaps no booking of any duration. Back-to-back is allowed.
- Booking window: tomorrow through +14 days, by calendar date in `ADMIN_TZ`. Only the backend computes it, so guests in other time zones may be offered slots on their local today.
- Slots are requested by event type and a UTC range `[from, to)`, matched on slot start. The backend returns only bookable slots.
- The calendar requests `[now, now + 16 days)` and groups slots by the guest's local date. It has no window or working-hours logic of its own.
- Event type: server-generated id, title, optional description, duration (a multiple of 15 minutes, 15–240). Titles need not be unique.
- The backend seeds a few event types at startup (e.g. "Intro call" 15m, "Consultation" 30m). The admin may edit or delete them like any other.
- A booking keeps its event type id and a snapshot of the type's title and duration. Editing or deleting an event type never changes existing bookings; overlap uses each booking's own interval.
- If there are no event types, the booking page says so.
- The backend re-validates every booking: input, event type, window, working hours, slot grid, overlap.
- API dates are ISO 8601 UTC. UI shows the browser's local time.

### Input limits

- Email: valid format, up to 254 characters.
- Name: 1–100 characters, not blank.
- Notes: up to 1000 characters; blank = omitted.
- Event type title: 1–100 characters, not blank.
- Event type description: up to 1000 characters; blank = omitted.
- Limits apply as sent; values are then trimmed before saving.

### Errors

Error body: `{ code, message }`. Checks run in table order.

| Status | `code` | When |
| --- | --- | --- |
| 400 | `invalid_input` | Malformed request, input limits, event type duration not allowed, `from` not before `to` |
| 404 | `event_type_not_found` | Unknown or deleted event type (listing slots, booking, edit, delete) |
| 422 | `invalid_slot` | Outside the booking window or working hours, or off the slot grid |
| 409 | `slot_taken` | Overlaps an existing booking |

Outside these checks: unknown route → 404 `not_found`; unexpected failure → 500 `internal_error`.

## API

| Method and path | `operationId` | Success | Errors |
| --- | --- | --- | --- |
| `GET /health` | `healthCheck` | 200 `Health` | |
| `GET /event-types` | `eventTypesList` | 200 `EventType[]`, by duration then title | |
| `POST /event-types` | `eventTypesCreate` | 201 `EventType` | 400 |
| `PUT /event-types/{id}` | `eventTypesUpdate` | 200 `EventType` | 400, 404 |
| `DELETE /event-types/{id}` | `eventTypesDelete` | 204, no body | 404 |
| `GET /event-types/{id}/slots?from&to` | `slotsList` | 200 `Slot[]`, earliest first | 400, 404 |
| `POST /bookings` | `bookingsCreate` | 201 `Booking` | 400, 404, 422, 409 |
| `GET /bookings` | `bookingsList` | 200 `Booking[]`: Upcoming bookings, earliest first | |

```
EventTypeInput { title, description?, durationMinutes }
EventType      { id, title, description?, durationMinutes }
Slot           { startsAt, endsAt }
BookingInput   { eventTypeId, startsAt, email, name, notes? }
Booking        { id, eventType: { id, title, durationMinutes }, startsAt, endsAt,
                 email, name, notes?, createdAt }
Error          { code, message }
```

- Ids are server-generated UUID strings. The `{id}` path parameter is a plain string, so any unknown id → 404.
- `PUT` replaces the whole event type: an omitted `description` is cleared.
- Durations are integer minutes. Times are `utcDateTime`; the backend computes `endsAt`.
- `Booking.eventType` is the snapshot taken at booking time.
- Optional text is absent when blank, never `null`. Email is trimmed only, not lowercased.
- Lists are bare arrays, sorted by the server, without pagination. `from` and `to` are required; the range has no maximum.
- Each operation declares only its own error statuses, with `code` narrowed to that status's codes. `not_found` and `internal_error` are not declared.
- The spec carries every input limit JSON Schema can express. Use cases re-validate all of them, plus the rest: not blank after trimming, duration a multiple of 15, `from` before `to`.

## Technical requirements

Node.js 26+, npm workspaces, TypeScript 6.x (stable `@hey-api/openapi-ts` fails on 7), ESM.

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
- React, React Router (declarative mode), Vite, Tailwind CSS, shadcn/ui. Client-rendered SPA: no server rendering.
- Build UI from shadcn/ui components. They live in `frontend/src/components/ui/`, are added with the shadcn CLI and may be edited.
- Server state: TanStack Query with the generated options. No other state library.
- Generated SDK uses `baseUrl: "/api"`. Spec paths and backend routes have no `/api` prefix.
- Development: Vite dev server proxies `/api/*` to the backend, stripping `/api`.
- Production: `vite build`, then a small Node.js server serves `dist/` (unknown non-API paths → `index.html`) and proxies `/api/*` the same way.

## Constraints

Do not edit, rename or delete `.github/workflows/hexlet-check.yml`. Do not rename the repository.
