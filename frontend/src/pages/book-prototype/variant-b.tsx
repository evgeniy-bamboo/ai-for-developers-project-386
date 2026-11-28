// PROTOTYPE — Variant B: type cards, then one wide panel: summary | calendar | times.
// Picking a time swaps calendar+times for the form; the summary stays. Type in URL, rest local.
import { ArrowLeft, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { BookingForm, NoticeAlert, Spinner, useBookingFlow, useHybridStore } from "./flow.tsx";
import { Confirmation, NoEventTypes } from "./parts.tsx";
import { fmtDate, fmtDuration, fmtTime, guestTz, localDateKey } from "./mock.ts";

export const name = "Split panel (cal.com-like)";

export function VariantB() {
  const flow = useBookingFlow(useHybridStore());
  const { type, date, slot } = flow;

  if (flow.done)
    return (
      <Card className="mx-auto max-w-lg p-6">
        <Confirmation booking={flow.done} onRestart={flow.restart} />
      </Card>
    );

  if (!type)
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Book a call</h1>
        <NoticeAlert notice={flow.notice} />
        {flow.types.isPending ? (
          <Spinner />
        ) : !flow.types.data?.length ? (
          <NoEventTypes />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flow.types.data.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => flow.pickType(t.id)}
                className="flex flex-col gap-2 rounded-xl bg-card p-5 text-left ring-1 ring-foreground/10 transition hover:ring-2 hover:ring-primary"
              >
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-4" /> {fmtDuration(t.durationMinutes)}
                </span>
                <span className="text-lg font-semibold">{t.title}</span>
                {t.description && (
                  <span className="line-clamp-3 text-sm text-muted-foreground">
                    {t.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );

  return (
    <Card className="grid gap-0 p-0 md:grid-cols-[16rem_1fr]">
      <aside className="flex flex-col gap-3 border-b p-5 md:border-r md:border-b-0">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => flow.pickType("")}>
          <ArrowLeft /> All event types
        </Button>
        <h1 className="text-xl font-bold">{type.title}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" /> {fmtDuration(type.durationMinutes)}
        </p>
        {type.description && <p className="text-sm text-muted-foreground">{type.description}</p>}
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Globe className="size-4" /> {guestTz()}
        </p>
        {slot && (
          <>
            <Separator />
            <p className="text-sm font-medium">
              {fmtDate(new Date(slot.startsAt))}
              <br />
              {fmtTime(slot.startsAt)}–{fmtTime(slot.endsAt)}
            </p>
          </>
        )}
      </aside>

      <section className="flex flex-col gap-4 p-5">
        <NoticeAlert notice={flow.notice} />
        {slot ? (
          <div className="flex max-w-md flex-col gap-4">
            <Button variant="ghost" size="sm" className="self-start" onClick={flow.back}>
              <ArrowLeft /> Change time
            </Button>
            <BookingForm flow={flow} />
          </div>
        ) : flow.slots.isPending ? (
          <Spinner label="Loading available dates…" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <Calendar
              mode="single"
              className="[--cell-size:--spacing(10)]"
              selected={date}
              onSelect={(d) => flow.pickDate(d && localDateKey(d))}
              disabled={(d) => !flow.byDate.has(localDateKey(d))}
              startMonth={flow.range.from}
              endMonth={flow.range.to}
            />
            <div className="flex flex-col gap-2">
              {!date ? (
                <p className="text-sm text-muted-foreground">Pick a date to see available times.</p>
              ) : (
                <>
                  <h2 className="font-semibold">{fmtDate(date)}</h2>
                  {flow.slots.isFetching ? (
                    <Spinner label="Refreshing times…" />
                  ) : flow.daySlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No times left on this date.</p>
                  ) : (
                    <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                      {flow.daySlots.map((s) => (
                        <Button
                          key={s.startsAt}
                          variant="outline"
                          size="lg"
                          onClick={() => flow.pickSlot(s.startsAt)}
                        >
                          {fmtTime(s.startsAt)}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </Card>
  );
}
