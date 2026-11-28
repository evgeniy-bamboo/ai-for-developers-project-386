// PROTOTYPE — Variant C: all steps on one page as numbered sections. Done sections collapse to a
// one-line summary with "Change"; later ones stay visible but locked. All steps in the URL (replace).
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { BookingForm, NoticeAlert, Spinner, useBookingFlow, useUrlStore } from "./flow.tsx";
import { Confirmation, NoEventTypes } from "./parts.tsx";
import { fmtDate, fmtDuration, fmtTime, guestTz, localDateKey, type Slot } from "./mock.ts";

export const name = "One page, collapsing sections";

function Section(props: {
  n: number;
  title: string;
  state: "open" | "done" | "locked";
  summary?: ReactNode;
  onChange?: () => void;
  children?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-card p-5 ring-1 ring-foreground/10",
        props.state === "locked" && "opacity-50",
      )}
    >
      <header className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
            props.state === "done" ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {props.state === "done" ? <Check className="size-4" /> : props.n}
        </span>
        <h2 className="font-semibold">{props.title}</h2>
        {props.state === "done" && (
          <>
            <span className="flex-1 truncate text-sm text-muted-foreground">{props.summary}</span>
            <Button variant="link" size="sm" onClick={props.onChange}>
              Change
            </Button>
          </>
        )}
      </header>
      {props.state === "open" && <div className="mt-4">{props.children}</div>}
    </section>
  );
}

function SlotGroups({ slots, onPick }: { slots: Slot[]; onPick: (s: string) => void }) {
  const groups = [
    ["Morning", slots.filter((s) => new Date(s.startsAt).getHours() < 12)],
    ["Afternoon", slots.filter((s) => new Date(s.startsAt).getHours() >= 12)],
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      {groups.map(
        ([label, list]) =>
          list.length > 0 && (
            <div key={label}>
              <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {list.map((s) => (
                  <Button
                    key={s.startsAt}
                    variant="secondary"
                    size="sm"
                    onClick={() => onPick(s.startsAt)}
                  >
                    {fmtTime(s.startsAt)}
                  </Button>
                ))}
              </div>
            </div>
          ),
      )}
    </div>
  );
}

const st = (done: boolean, reachable: boolean) => (done ? "done" : reachable ? "open" : "locked");

export function VariantC() {
  const flow = useBookingFlow(useUrlStore({ replace: true }));
  const { type, date, slot } = flow;

  if (flow.done)
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <Confirmation booking={flow.done} onRestart={flow.restart} />
      </div>
    );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <h1 className="text-3xl font-bold">Book a call</h1>
      <p className="text-sm text-muted-foreground">
        Times are shown in your time zone, {guestTz()}.
      </p>
      <NoticeAlert notice={flow.notice} />

      <Section
        n={1}
        title="Event type"
        state={st(!!type, true)}
        summary={type && `${type.title} · ${fmtDuration(type.durationMinutes)}`}
        onChange={() => flow.pickType("")}
      >
        {flow.types.isPending ? (
          <Spinner />
        ) : !flow.types.data?.length ? (
          <NoEventTypes />
        ) : (
          <div className="flex flex-col gap-2">
            {flow.types.data.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <input
                  type="radio"
                  name="type"
                  className="mt-1"
                  checked={t.id === flow.store.state.typeId}
                  onChange={() => flow.pickType(t.id)}
                />
                <span className="flex-1">
                  <span className="font-medium">{t.title}</span>
                  {t.description && (
                    <span className="block text-sm text-muted-foreground">{t.description}</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">
                  {fmtDuration(t.durationMinutes)}
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section
        n={2}
        title="Date and time"
        state={st(!!slot, !!type)}
        summary={slot && `${fmtDate(new Date(slot.startsAt))}, ${fmtTime(slot.startsAt)}`}
        onChange={() => flow.pickSlot(undefined)}
      >
        {flow.slots.isPending ? (
          <Spinner label="Loading available dates…" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date ?? flow.firstDate}
              onSelect={(d) => flow.pickDate(d && localDateKey(d))}
              disabled={(d) => !flow.byDate.has(localDateKey(d))}
              startMonth={flow.range.from}
              endMonth={flow.range.to}
            />
            <div>
              {!date ? (
                <p className="text-sm text-muted-foreground">Pick a date first.</p>
              ) : flow.slots.isFetching ? (
                <Spinner label="Refreshing times…" />
              ) : flow.daySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No times left on {fmtDate(date)}.</p>
              ) : (
                <>
                  <h3 className="mb-3 text-sm font-semibold">{fmtDate(date)}</h3>
                  <SlotGroups slots={flow.daySlots} onPick={flow.pickSlot} />
                </>
              )}
            </div>
          </div>
        )}
      </Section>

      <Section n={3} title="Your details" state={st(false, !!slot)}>
        <BookingForm
          flow={flow}
          submitLabel={slot ? `Book ${fmtTime(slot.startsAt)}` : undefined}
        />
      </Section>
    </div>
  );
}
