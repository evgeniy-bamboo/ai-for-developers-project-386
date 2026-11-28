// PROTOTYPE — throwaway pieces every variant renders the same way.
import { CalendarX2, CircleCheck } from "lucide-react";
import { Link } from "react-router";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { type Booking, fmtDate, fmtDuration, fmtTime } from "./mock.ts";

export function NoEventTypes() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <CalendarX2 className="size-8 text-muted-foreground" />
        <EmptyTitle className="text-base">No calls to book yet</EmptyTitle>
        <EmptyDescription>
          There are no event types right now. Please check back later.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      </EmptyContent>
    </Empty>
  );
}

export function Confirmation({ booking, onRestart }: { booking: Booking; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <CircleCheck className="size-10 text-green-600" />
      <h2 className="text-xl font-semibold">You are booked</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left text-sm">
        <dt className="text-muted-foreground">What</dt>
        <dd>
          {booking.eventType.title} · {fmtDuration(booking.eventType.durationMinutes)}
        </dd>
        <dt className="text-muted-foreground">When</dt>
        <dd>
          {fmtDate(new Date(booking.startsAt))}, {fmtTime(booking.startsAt)}–
          {fmtTime(booking.endsAt)}
        </dd>
        <dt className="text-muted-foreground">Who</dt>
        <dd>
          {booking.name} ({booking.email})
        </dd>
        {booking.notes && (
          <>
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="whitespace-pre-wrap">{booking.notes}</dd>
          </>
        )}
      </dl>
      <Button variant="outline" onClick={onRestart}>
        Book another call
      </Button>
    </div>
  );
}
