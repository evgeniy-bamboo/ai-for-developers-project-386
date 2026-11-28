// PROTOTYPE — Variant A: one step per screen, every step in the URL (back button = previous step).
import { ArrowLeft, CalendarCheck, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { BookingForm, NoticeAlert, Spinner, useBookingFlow, useUrlStore } from "./flow.tsx";
import { Confirmation, NoEventTypes } from "./parts.tsx";
import { fmtDate, fmtDuration, fmtTime, guestTz, localDateKey } from "./mock.ts";

export const name = "Wizard, steps in URL";

export function VariantA() {
  const flow = useBookingFlow(useUrlStore());
  const { type, date, slot } = flow;
  const step = flow.done ? 5 : !type ? 1 : !date ? 2 : !slot ? 3 : 4;
  const titles = ["Choose an event type", "Pick a date", "Pick a time", "Your details", "Booked"];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {step > 1 && step < 5 && (
          <Button variant="ghost" size="sm" onClick={flow.back}>
            <ArrowLeft /> Back
          </Button>
        )}
        {step < 5 && <span>Step {step} of 4</span>}
      </div>
      <NoticeAlert notice={flow.notice} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-bold">{titles[step - 1]}</h1>
          </CardTitle>
          {type && step < 5 && (
            <p className="text-muted-foreground">
              {type.title} · {fmtDuration(type.durationMinutes)}
              {date && ` · ${fmtDate(date)}`}
              {slot && ` · ${fmtTime(slot.startsAt)}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {step === 1 &&
            (flow.types.isPending ? (
              <Spinner />
            ) : !flow.types.data?.length ? (
              <NoEventTypes />
            ) : (
              <ul className="flex flex-col divide-y">
                {flow.types.data.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => flow.pickType(t.id)}
                      className="flex w-full items-center gap-4 py-3 text-left hover:bg-muted/50"
                    >
                      <span className="flex w-16 shrink-0 items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="size-3.5" />
                        {fmtDuration(t.durationMinutes)}
                      </span>
                      <span className="flex-1">
                        <span className="font-medium">{t.title}</span>
                        {t.description && (
                          <span className="block text-sm text-muted-foreground">
                            {t.description}
                          </span>
                        )}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            ))}

          {step === 2 &&
            (flow.slots.isPending ? (
              <Spinner label="Loading available dates…" />
            ) : (
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  className="[--cell-size:--spacing(10)]"
                  selected={date}
                  onSelect={(d) => d && flow.pickDate(localDateKey(d))}
                  disabled={(d) => !flow.byDate.has(localDateKey(d))}
                  startMonth={flow.range.from}
                  endMonth={flow.range.to}
                />
              </div>
            ))}

          {step === 3 &&
            (flow.slots.isFetching ? (
              <Spinner label="Refreshing times…" />
            ) : flow.daySlots.length === 0 ? (
              <p className="text-muted-foreground">
                No times left on this date.{" "}
                <Button variant="link" onClick={() => flow.pickDate(undefined)}>
                  Pick another date
                </Button>
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {flow.daySlots.map((s) => (
                  <Button
                    key={s.startsAt}
                    variant="outline"
                    onClick={() => flow.pickSlot(s.startsAt)}
                  >
                    {fmtTime(s.startsAt)}
                  </Button>
                ))}
              </div>
            ))}

          {step === 4 && <BookingForm flow={flow} />}
          {step === 5 && flow.done && <Confirmation booking={flow.done} onRestart={flow.restart} />}
        </CardContent>
      </Card>
      {step >= 2 && step <= 3 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarCheck className="size-3.5" /> Times are in your time zone ({guestTz()}).
        </p>
      )}
    </div>
  );
}
