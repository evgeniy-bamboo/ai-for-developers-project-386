# Research: computing `ADMIN_TZ` wall-clock times in Node 24

Question ([#3](https://github.com/evgeniy-bamboo/ai-for-developers-project-386/issues/3)): how should the backend turn "Mon–Fri 09:00–18:00 in `ADMIN_TZ`" and "tomorrow through +14 days by calendar date in `ADMIN_TZ`" into UTC instants on the pinned Node, which has no global `Temporal`?

Researched 2026-11-29 against Node 24.22.3 (`mise.lock`), V8 13.6.233.17, ICU 78.3, tzdata 2026e, TypeScript 6.0.3.

## Answer

Use **`temporal-polyfill`** (fullcalendar, MIT, v1.0.8) as a **ponyfill**: `import { Temporal } from "temporal-polyfill"` in every module that needs it. Do not use the global.

- It is the Temporal API, now Stage 4, so the code is the code you would write natively. On Node 26+ the ponyfill hands back the native `Temporal`, and the dependency can be dropped by deleting the imports.
- Correct by construction: `PlainDate` / `PlainTime` / `Instant` / `ZonedDateTime` separate wall-clock values from instants, and DST gaps and overlaps resolve by a documented rule.
- Validation: `new Temporal.ZonedDateTime(0n, id)` throws `RangeError` on an unknown zone.
- Small: one runtime dependency tree of ~1 MB on disk, 19.2 kB min+gzip; types included and pass TS 6 `strict` with `skipLibCheck: false`.
- Testable: the clock returns a `Temporal.Instant`; no fake timers, and the host time zone never leaks in.

Alternative worth one decision: bump `mise.toml` from Node 24 to **Node 26**, Active LTS since 2026-10-28, which ships `Temporal` unflagged. Then use the global and add no dependency. The README says "Node.js 24+", so this is allowed, but whether Hexlet's check or the deployment host runs 26 is unknown (see the map's "Deployment" item). The ponyfill keeps both open.

## Options

### Native `Temporal` in Node 24: no

- Node 24.22.3 has no global `Temporal`: `typeof Temporal` is `"undefined"`.
- V8 13.6 has a `--harmony-temporal` flag, described by `node --v8-options` as `enable "Temporal" (in progress / experimental)`. With it, `Temporal` exists and simple calls work, but the implementation is incomplete: `ZonedDateTime.prototype.getTimeZoneTransition` is missing (`TypeError: zdt.getTimeZoneTransition is not a function`, tested locally).
- The flag cannot be set in `NODE_OPTIONS` (`--harmony-temporal is not allowed in NODE_OPTIONS`), so every `node` invocation (server, `node --test`, `--watch`) would need it on the command line.
- Node enabled Temporal by default only in 26.0.0: "The Temporal API is now enabled by default in Node.js 26" ([v26.0.0 release post](https://nodejs.org/en/blog/release/v26.0.0)). The change, [nodejs/node#61806](https://github.com/nodejs/node/pull/61806), is `semver-major` and needs a Rust toolchain at build time, so a backport to 24 is not expected.
- Schedule ([nodejs/Release schedule.json](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json)): v24 LTS 2025-10-28, maintenance from 2026-10-20, end 2028-04-30; v26 LTS 2026-10-28, end 2029-04-30.
- Temporal reached Stage 4 at TC39's March 2026 plenary; Chrome 144 and Firefox 139 ship it ([Igalia](https://www.igalia.com/2026/03/13/Temporal-Reaches-Stage-4.html)).

### Type trap: TypeScript 6 already declares the global

TS 6's `lib.esnext.d.ts` references `esnext.temporal`, and `tsconfig.base.json` uses `target: "esnext"` with the default lib. So code that uses the global `Temporal` without an import **type-checks and then throws `ReferenceError: Temporal is not defined` on Node 24** (tested). Mitigations:

- Always import `Temporal` from `temporal-polyfill`; the named import shadows the global type.
- Optionally forbid the global with oxlint `no-restricted-globals` for `Temporal` until the project moves to Node 26.

### `temporal-polyfill` (fullcalendar): recommended

From the package README (v1.0.8):

- Spec compliance "near-perfect with just 2 intentional deviations" against test262; "All time zones are supported". The default entry point supports `iso8601` and `gregory` calendars, which is all we need.
- Entry points: `temporal-polyfill` is a side-effect-free ponyfill that "uses native if available"; `temporal-polyfill/global` installs the global. Implementation: `const Temporal = NativeTemporal || Temporal$1` with `NativeTemporal = globalThis.Temporal`.
- Size 19.2 kB min+gzip vs 52.1 kB for `@js-temporal/polyfill`; spec date November 2026. CI runs Node 16 through 26. ESM-only, fine here.
- Dependencies: `temporal-spec` (types) and `temporal-utils`. On disk ~1 MB.
- Types: `index.d.ts` re-exports `temporal-spec`. A sketch importing it type-checks under the repo's compiler options (`strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `module: nodenext`) with `skipLibCheck: false`.
- Time zone data comes from the runtime's `Intl` (ICU), so it is the same tzdata as Node itself.
- Speed: all slots for 16 days at 15 min in `Europe/Berlin` (432 conversions) took ~41 ms cold, ~10 ms warm. Enough for this app.

Caveat: if someone ran Node 24 with `--harmony-temporal`, the ponyfill would pick the incomplete native one. Nobody should; `temporal-polyfill/implementation` forces the polyfill if that ever matters.

### `@js-temporal/polyfill` (v0.5.1): works, heavier, not yet production

Kicked off by the proposal champions. Its README still lists "Release production version to NPM" as an open roadmap item and the goal as "ready for production use when the Temporal proposal reaches Stage 4". It pulls in `jsbi`; 52.1 kB min+gzip and ~3.5 MB on disk, and its spec snapshot is March 2025. Same API, so nothing is gained over `temporal-polyfill`.

### Plain `Intl`: possible, not worth it

`Intl.DateTimeFormat` handles UTC instant → wall clock (`formatToParts` with `timeZone`) and validates names (`new Intl.DateTimeFormat("en", { timeZone })` throws `RangeError`). The reverse, wall clock → instant, has no API: you guess an offset, format, correct, and repeat, then handle gaps and overlaps yourself. That is the code the polyfills already contain and test against test262. No dependency, but more code to own and test, and the result is `Date`/number values that are easy to mix up with local-time `Date` getters.

### `date-fns-tz` (v3.2.0, with `date-fns` 4): no

- `toZonedTime` returns a `Date` whose system-local fields show the zone time: a fake instant that is wrong if compared or serialized.
- `fromZonedTime` resolves a gap time **backwards**: Berlin `2026-03-29T02:30` → `00:30Z` (01:30 local), and a skipped midnight lands on the **previous day**: `Asia/Beirut 2026-03-29T00:00` → `21:00Z` = 23:00 on 03-28 local; `America/Santiago 2026-09-06T00:00` → 23:00 on 09-05 local (tested).
- Invalid zone → `Invalid Date` or `NaN`, never a throw; validation must check for it.
- Pulls in all of `date-fns` (~10 MB on disk).

### `@date-fns/tz` (v1.5.0): workable, not preferred

`TZDate` is a `Date` subclass that does its getters and setters in a zone. Small (~100 kB on disk, no dependencies) and resolved gaps the same way as Temporal in all tested cases. Downsides: an invalid zone gives `NaN` time instead of throwing; it accepts offsets like `"+08:00"` by design; there is no date-only type, so "calendar date in zone" is a `Date` at some time of day; and it still has the `Date` API, where a stray `new Date()` or local getter reintroduces host-time-zone bugs.

### Luxon (v3.7.2): workable, not preferred

Immutable `DateTime` with zones. Invalid zone gives an invalid `DateTime` (`isValid === false`, `invalidReason: 'unsupported zone'`) instead of throwing; `Info.isValidIANAZone` exists. Gaps move forward an hour. For overlaps the [docs](https://raw.githubusercontent.com/moment/luxon/master/docs/zones.md) say "Luxon's behavior here is undefined". Types come from `@types/luxon`. ~4.5 MB on disk. A different API from the standard that is now shipping.

## DST: does 09:00–18:00 ever hit a transition?

Scan with `temporal-polyfill` over all 418 zones in `Intl.supportedValuesOf("timeZone")`, every offset transition 2020-01-01 to 2036-01-01 (future years from current tzdata rules): **0 transitions have a local time before or after inside 09:00–18:00**. All happen between 21:00 and 04:00 local. Historic zones did transition at other hours, and governments change rules at short notice, so the code should still be correct in a gap or overlap, but no current zone tests it in practice.

What does matter is **midnight**. In 2026–2027 local midnight does not exist on the spring-forward day in `Africa/Cairo`, `America/Havana`, `America/Santiago`, `Asia/Beirut` and `Atlantic/Azores` (23:59 → 01:00), and in fall-back zones like 00:59 → 00:00 it occurs twice. Code that builds "date T00:00 in zone" to find day boundaries can land on the wrong day: `date-fns-tz` does exactly that above. Two rules avoid it:

- Compute the booking window by comparing **calendar dates** (`Instant` → `PlainDate` in zone), never by midnight instants.
- If a day-start instant is ever needed, use `PlainDate#toZonedDateTime(tz)`, which returns the real start of day (01:00 in Santiago on 2026-09-06).

For working hours, the default `disambiguation: "compatible"` (gap → later, overlap → earlier) is fine. Generate slot starts on the **wall-clock** grid (09:00, 09:15, …) and convert each, rather than adding 15 minutes to an instant, so the grid stays on the quarter hour of local time.

## Validating `ADMIN_TZ`

Tested with `Intl.DateTimeFormat`, `Temporal` (polyfill), `TZDate` and Luxon:

| Input | Temporal / Intl | Note |
| --- | --- | --- |
| `Europe/Berlin`, `UTC`, `Etc/GMT+3` | valid | |
| `europe/berlin`, `utc` | valid, normalized to `Europe/Berlin`, `UTC` | case-insensitive |
| `US/Eastern`, `EST` | valid | aliases; `Intl` canonicalizes `EST` to `America/Panama`, Temporal keeps the ID |
| `+03:00` | valid | offset, not an IANA name: reject explicitly |
| `Not/AZone`, `""`, `Local` | `RangeError` | |

Do not validate against `Intl.supportedValuesOf("timeZone")`: it lists ICU's canonical IDs, e.g. `Europe/Kiev` but not `Europe/Kyiv`, so it rejects valid names.

Decision left to the implementer: whether an empty `ADMIN_TZ=` means "unset" (→ `UTC`) or is invalid. The sketch treats it as invalid.

## Sketch

Type-checked with the repo's compiler options and tested with `node --test` on Node 24.22.3.

```ts
import { Temporal } from "temporal-polyfill";

/** Reads ADMIN_TZ at startup. Throws on anything that is not an IANA name. */
export function parseAdminTimeZone(raw: string | undefined): string {
  const id = raw ?? "UTC";
  // Temporal and Intl also accept offsets like "+03:00"; the README asks for an IANA name.
  if (/^[+-]/.test(id)) throw new RangeError(`ADMIN_TZ must be an IANA name: ${id}`);
  // Throws RangeError for unknown names. Returns the case-normalized ID.
  return new Temporal.ZonedDateTime(0n, id).timeZoneId;
}

/** Wall-clock date + time in the zone -> UTC instant. */
export function wallClockToInstant(
  date: Temporal.PlainDate,
  time: Temporal.PlainTime,
  timeZone: string,
): Temporal.Instant {
  // Default disambiguation "compatible": a gap moves forward, an overlap takes the earlier time.
  return date.toZonedDateTime({ timeZone, plainTime: time }).toInstant();
}

/** UTC instant -> calendar date in the zone. */
export function dateInZone(instant: Temporal.Instant, timeZone: string): Temporal.PlainDate {
  return instant.toZonedDateTimeISO(timeZone).toPlainDate();
}

/** Booking window: tomorrow through +14 days, by calendar date in the zone. */
export function isInBookingWindow(
  slotStart: Temporal.Instant,
  now: Temporal.Instant,
  timeZone: string,
): boolean {
  const today = dateInZone(now, timeZone);
  const day = dateInZone(slotStart, timeZone);
  return (
    Temporal.PlainDate.compare(day, today.add({ days: 1 })) >= 0 &&
    Temporal.PlainDate.compare(day, today.add({ days: 14 })) <= 0
  );
}

const OPEN = Temporal.PlainTime.from("09:00");
const CLOSE = Temporal.PlainTime.from("18:00");

/** Slot starts for one date: every 15 min of wall-clock time, ending by 18:00. */
export function slotStarts(
  date: Temporal.PlainDate,
  minutes: number,
  timeZone: string,
): Temporal.Instant[] {
  if (date.dayOfWeek > 5) return [];
  const close = wallClockToInstant(date, CLOSE, timeZone);
  const starts: Temporal.Instant[] = [];
  for (let t = OPEN; Temporal.PlainTime.compare(t, CLOSE) < 0; t = t.add({ minutes: 15 })) {
    const start = wallClockToInstant(date, t, timeZone);
    if (Temporal.Instant.compare(start.add({ minutes }), close) <= 0) starts.push(start);
  }
  return starts;
}
```

Test with an injected clock, no fake timers:

```ts
test("booking window by date in zone", () => {
  const now = Temporal.Instant.from("2026-07-01T22:30:00Z"); // 2026-07-02 07:30 in Tokyo
  assert.equal(isInBookingWindow(Temporal.Instant.from("2026-07-02T01:00:00Z"), now, "Asia/Tokyo"), false); // today
  assert.equal(isInBookingWindow(Temporal.Instant.from("2026-07-16T01:00:00Z"), now, "Asia/Tokyo"), true); // +14
});
```

Notes for implementation:

- Clock: `type Clock = () => Temporal.Instant`; production is `() => Temporal.Now.instant()`.
- API strings: parse with `Temporal.Instant.from(s)`; it requires `Z` or an offset. `Instant#toString()` omits zero fractional seconds (`…T07:00:00Z`), unlike `Date#toISOString()` (`…T07:00:00.000Z`). Both are ISO 8601; pick one with `toString({ fractionalSecondDigits: 3 })` if the API should be uniform.
- Validating a booking start: convert to `ZonedDateTime` in the zone, then check weekday 1–5, minute % 15 = 0, seconds and sub-seconds 0, start ≥ 09:00 and end instant ≤ the 18:00 instant of that date.
- Dependency-cruiser allows the package in `backend/src/domain/`; it must be a production dependency of `backend`.

## Sources

- Node 24.22.3 local runs: `node --v8-options`, `node --harmony-temporal`, `NODE_OPTIONS`, library comparisons and the zone scan (scripts not committed).
- [Node.js v26.0.0 release post](https://nodejs.org/en/blog/release/v26.0.0); [nodejs/node#61806](https://github.com/nodejs/node/pull/61806); [Node.js release schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json).
- [Igalia: Temporal reaches Stage 4](https://www.igalia.com/2026/03/13/Temporal-Reaches-Stage-4.html).
- TypeScript 6.0.3 `lib/lib.esnext.d.ts`, `lib/lib.esnext.temporal.d.ts`.
- [temporal-polyfill README](https://github.com/fullcalendar/temporal-polyfill) and package source v1.0.8.
- [@js-temporal/polyfill README](https://github.com/js-temporal/temporal-polyfill) v0.5.1.
- [date-fns-tz README](https://github.com/marnusw/date-fns-tz) v3.2.0; [@date-fns/tz README](https://github.com/date-fns/tz) v1.5.0.
- [Luxon zones docs](https://github.com/moment/luxon/blob/master/docs/zones.md) v3.7.2.
