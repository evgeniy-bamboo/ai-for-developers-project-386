// PROTOTYPE — throwaway. In-memory stand-in for the generated SDK; shapes follow README "API".
// Working hours are faked in the browser's local zone (the real backend uses ADMIN_TZ).

export type EventType = {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
};
export type Slot = { startsAt: string; endsAt: string };
export type BookingInput = {
  eventTypeId: string;
  startsAt: string;
  email: string;
  name: string;
  notes?: string;
};
export type Booking = {
  id: string;
  eventType: { id: string; title: string; durationMinutes: number };
  startsAt: string;
  endsAt: string;
  email: string;
  name: string;
  notes?: string;
  createdAt: string;
};
export type ApiErrorCode =
  | "invalid_input"
  | "event_type_not_found"
  | "invalid_slot"
  | "slot_taken"
  | "internal_error";
export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** What the next `bookingsCreate` call does. Set from the prototype bar; resets to "ok" after use. */
export type Scenario = "ok" | ApiErrorCode | "network";
export const scenarios: Scenario[] = [
  "ok",
  "slot_taken",
  "invalid_slot",
  "event_type_not_found",
  "invalid_input",
  "internal_error",
  "network",
];

const MIN = 60_000;
const seededTypes: EventType[] = [
  {
    id: "t-consult",
    title: "Consultation",
    description: "Half an hour to go through your question in detail.",
    durationMinutes: 30,
  },
  {
    id: "t-intro",
    title: "Intro call",
    description: "A quick hello to see if we are a good fit.",
    durationMinutes: 15,
  },
  { id: "t-review", title: "Code review", durationMinutes: 60 },
  {
    id: "t-deep",
    title: "Architecture deep dive",
    description:
      "Two hours on your system's design: bring diagrams, constraints and the decisions you are unsure about. We will leave with a written list of next steps.",
    durationMinutes: 120,
  },
  { id: "t-async", title: "Async Q&A", description: "Short and focused.", durationMinutes: 15 },
];

let types: EventType[] = [...seededTypes];
type Interval = { start: number; end: number };
let busy: Interval[] = seedBusy();
const bookings: Booking[] = [];

function seedBusy(): Interval[] {
  const out: Interval[] = [];
  const today = startOfLocalDay(new Date());
  for (let d = 1; d <= 15; d++) {
    const day = new Date(today);
    day.setDate(day.getDate() + d);
    const at = (h: number, m: number, len: number) => {
      const s = new Date(day);
      s.setHours(h, m, 0, 0);
      out.push({ start: s.getTime(), end: s.getTime() + len * MIN });
    };
    if (d === 3) at(9, 0, 9 * 60); // a fully booked weekday → disabled in the calendar
    else {
      at(10, 0, 60);
      at(13, 30, 30);
      if (d % 2) at(15, 0, 90);
    }
  }
  return out;
}

export function resetMock(opts: { empty: boolean }) {
  types = opts.empty ? [] : [...seededTypes];
  busy = seedBusy();
  bookings.length = 0;
}

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export async function eventTypesList(): Promise<EventType[]> {
  await delay();
  return types.toSorted(
    (a, b) => a.durationMinutes - b.durationMinutes || a.title.localeCompare(b.title),
  );
}

/** Mirrors the backend: window = tomorrow … +14 days, Mon–Fri 09:00–18:00, 15-min grid, no overlap. */
export async function slotsList(eventTypeId: string, from: Date, to: Date): Promise<Slot[]> {
  await delay();
  const type = types.find((t) => t.id === eventTypeId);
  if (!type) throw new ApiError(404, "event_type_not_found", "Event type not found");
  const out: Slot[] = [];
  const today = startOfLocalDay(new Date());
  for (let d = 1; d <= 14; d++) {
    const day = new Date(today);
    day.setDate(day.getDate() + d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    const open = new Date(day).setHours(9, 0, 0, 0);
    const close = new Date(day).setHours(18, 0, 0, 0);
    for (let s = open; s + type.durationMinutes * MIN <= close; s += 15 * MIN) {
      const e = s + type.durationMinutes * MIN;
      if (s < from.getTime() || s >= to.getTime()) continue;
      if (busy.some((b) => b.start < e && s < b.end)) continue;
      out.push({ startsAt: new Date(s).toISOString(), endsAt: new Date(e).toISOString() });
    }
  }
  return out;
}

export async function bookingsCreate(input: BookingInput, scenario: Scenario): Promise<Booking> {
  await delay(700);
  const start = Date.parse(input.startsAt);
  const type = types.find((t) => t.id === input.eventTypeId);
  switch (scenario) {
    case "network":
      throw new TypeError("Failed to fetch");
    case "internal_error":
      throw new ApiError(500, "internal_error", "Internal server error");
    case "invalid_input":
      throw new ApiError(400, "invalid_input", 'body/email must match format "email"');
    case "event_type_not_found":
      types = types.filter((t) => t.id !== input.eventTypeId); // the Admin deleted it meanwhile
      throw new ApiError(404, "event_type_not_found", "Event type not found");
    case "slot_taken":
      busy.push({ start, end: start + (type?.durationMinutes ?? 15) * MIN }); // someone else won the race
      throw new ApiError(409, "slot_taken", "Slot is already taken");
    case "invalid_slot":
      busy.push({ start, end: start + 15 * MIN }); // e.g. the window moved past midnight
      throw new ApiError(422, "invalid_slot", "Slot is outside the booking window");
    case "ok":
      break;
  }
  if (!type) throw new ApiError(404, "event_type_not_found", "Event type not found");
  const end = start + type.durationMinutes * MIN;
  busy.push({ start, end });
  const booking: Booking = {
    id: crypto.randomUUID(),
    eventType: { id: type.id, title: type.title, durationMinutes: type.durationMinutes },
    startsAt: input.startsAt,
    endsAt: new Date(end).toISOString(),
    email: input.email.trim(),
    name: input.name.trim(),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  return booking;
}

// ---- pure helpers (the real ones get node:test unit tests) ----

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` of the guest's local date. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function groupSlotsByLocalDate(slots: Slot[]): Map<string, Slot[]> {
  const out = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = localDateKey(new Date(s.startsAt));
    out.set(k, [...(out.get(k) ?? []), s]);
  }
  return out;
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
export const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
export const fmtDuration = (m: number) =>
  m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
export const guestTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
