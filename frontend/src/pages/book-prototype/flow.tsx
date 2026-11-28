// PROTOTYPE — throwaway. Booking-flow behaviour shared by all variants: where step state lives,
// queries, and the README's per-error-code reactions. Only the rendering differs per variant.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  ApiError,
  type Booking,
  bookingsCreate,
  eventTypesList,
  groupSlotsByLocalDate,
  keyToDate,
  type Scenario,
  slotsList,
} from "./mock.ts";

type FlowState = { typeId?: string; date?: string; slot?: string };
export type Store = {
  kind: string;
  state: FlowState;
  set: (next: FlowState) => void;
};

/**
 * Every step in the URL: `?type=&date=&slot=`. Reload keeps them. With `replace`, picks don't add
 * history entries (Back leaves the page); without it, Back walks the steps.
 */
export function useUrlStore({ replace = false } = {}): Store {
  const [params, setParams] = useSearchParams();
  const state: FlowState = {
    typeId: params.get("type") ?? undefined,
    date: params.get("date") ?? undefined,
    slot: params.get("slot") ?? undefined,
  };
  return {
    kind: `URL${replace ? " (replace)" : ""}: type, date, slot`,
    state,
    set: (next) =>
      setParams(
        (p) => {
          for (const [k, v] of [
            ["type", next.typeId],
            ["date", next.date],
            ["slot", next.slot],
          ] as const)
            if (v) p.set(k, v);
            else p.delete(k);
          return p;
        },
        { replace },
      ),
  };
}

/** Event type in the URL (shareable link to one type); date and slot in component state. */
export function useHybridStore(): Store {
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState<Omit<FlowState, "typeId">>({});
  const typeId = params.get("type") ?? undefined;
  return {
    kind: "URL: type · component: date, slot",
    state: { typeId, ...local },
    set: ({ typeId: t, ...rest }) => {
      if (t !== typeId)
        setParams((p) => {
          if (t) p.set("type", t);
          else p.delete("type");
          return p;
        });
      setLocal(rest);
    },
  };
}

// ---- prototype controls (scenario of next submit, debug readout) ----

export type Controls = {
  scenario: Scenario;
  consumeScenario: () => void;
  report: (s: Record<string, unknown>) => void;
};
export const ControlsContext = createContext<Controls>({
  scenario: "ok",
  consumeScenario: () => {},
  report: () => {},
});

export type Notice = { code: "slot_taken" | "invalid_slot" | "event_type_not_found"; text: string };

const noticeText = {
  slot_taken: "Sorry, someone has just booked that time. Please pick another one.",
  invalid_slot: "That time can no longer be booked. Please pick another one.",
  event_type_not_found: "This event type is no longer offered. Please choose another one.",
} as const;

export function useBookingFlow(store: Store) {
  const { scenario, consumeScenario, report } = useContext(ControlsContext);
  const qc = useQueryClient();
  const { set } = store;
  const [notice, setNotice] = useState<Notice>();
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState<Booking>();
  // Lives here, not in the form, so it survives the form unmounting (e.g. after slot_taken).
  const [details, setDetails] = useState({ email: "", name: "", notes: "" });
  // The calendar asks for [now, now + 16 days) once per type and groups locally.
  const [range] = useState(() => {
    const from = new Date();
    return { from, to: new Date(from.getTime() + 16 * 86_400_000) };
  });

  // Stale values in the store (old link, deleted type, slot booked since) are ignored, not
  // cleaned up: the effective state is derived on every render; the next pick overwrites them.
  const types = useQuery({ queryKey: ["eventTypes"], queryFn: eventTypesList });
  const type = types.data?.find((t) => t.id === store.state.typeId);
  const typeGone = !!types.data && !!store.state.typeId && !type;
  const typeId = typeGone ? undefined : store.state.typeId;

  const slots = useQuery({
    queryKey: ["slots", typeId],
    queryFn: () => slotsList(typeId ?? "", range.from, range.to),
    enabled: !!typeId,
  });
  const byDate = useMemo(() => groupSlotsByLocalDate(slots.data ?? []), [slots.data]);
  const dateKey =
    typeId && store.state.date && (!slots.data || byDate.has(store.state.date))
      ? store.state.date
      : undefined;
  const daySlots = dateKey ? (byDate.get(dateKey) ?? []) : [];
  const slot = daySlots.find((s) => s.startsAt === store.state.slot);
  const firstKey = byDate.keys().next().value;
  const state: FlowState = { typeId, date: dateKey, slot: slot?.startsAt };

  const mutation = useMutation({
    mutationFn: () =>
      bookingsCreate(
        {
          eventTypeId: state.typeId ?? "",
          startsAt: state.slot ?? "",
          ...details,
          notes: details.notes || undefined,
        },
        scenario,
      ),
    onMutate: () => {
      setFormError(undefined);
      setNotice(undefined);
    },
    onSettled: consumeScenario,
    onSuccess: (b) => {
      setDone(b);
      setDetails({ email: "", name: "", notes: "" });
      set({});
      void qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e) => {
      const code = e instanceof ApiError ? e.code : "network";
      if (code === "slot_taken" || code === "invalid_slot") {
        setNotice({ code, text: noticeText[code] });
        void qc.invalidateQueries({ queryKey: ["slots", state.typeId] });
        set({ typeId: state.typeId, date: state.date }); // keep the date, drop the slot
      } else if (code === "event_type_not_found") {
        setNotice({ code, text: noticeText[code] });
        void qc.invalidateQueries({ queryKey: ["eventTypes"] });
        set({});
      } else if (code === "invalid_input") {
        setFormError(`Please check your details: ${e.message}`);
      } else {
        setFormError("Something went wrong. Your details are kept — please try again.");
      }
    },
  });

  const flow = {
    store,
    types,
    type,
    slots,
    byDate,
    daySlots,
    slot,
    date: dateKey ? keyToDate(dateKey) : undefined,
    firstDate: firstKey ? keyToDate(firstKey) : undefined,
    range,
    details,
    setDetails,
    notice:
      notice ??
      (typeGone
        ? ({ code: "event_type_not_found", text: noticeText.event_type_not_found } as const)
        : undefined),
    formError,
    done,
    submitting: mutation.isPending,
    pickType: (id: string) => {
      setNotice(undefined);
      set({ typeId: id });
    },
    pickDate: (key: string | undefined) => {
      setNotice(undefined);
      set({ typeId: state.typeId, date: key });
    },
    pickSlot: (startsAt: string | undefined) => {
      setNotice(undefined);
      set({ ...state, slot: startsAt });
    },
    back: () => {
      setNotice(undefined);
      setFormError(undefined);
      if (state.slot) set({ typeId: state.typeId, date: state.date });
      else if (state.date) set({ typeId: state.typeId });
      else set({});
    },
    restart: () => {
      setDone(undefined);
      set({});
    },
    submit: () => mutation.mutate(),
  };

  useEffect(() => {
    report({
      store: store.kind,
      ...state,
      notice: flow.notice?.code,
      formError: !!formError,
      done: !!done,
    });
  });

  return flow;
}
export type Flow = ReturnType<typeof useBookingFlow>;

// ---- shared bits ----

export function NoticeAlert({ notice }: { notice?: Notice }) {
  if (!notice) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{notice.text}</AlertTitle>
    </Alert>
  );
}

/** Controlled by `flow.details`, so values survive errors and the form unmounting. */
export function BookingForm({
  flow,
  submitLabel = "Confirm booking",
}: {
  flow: Flow;
  submitLabel?: string;
}) {
  const field = (k: keyof Flow["details"]) => ({
    name: k,
    id: k,
    value: flow.details[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      flow.setDetails((d) => ({ ...d, [k]: e.target.value })),
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        flow.submit();
      }}
    >
      {flow.formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{flow.formError}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input {...field("email")} type="email" required maxLength={254} autoComplete="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <Input {...field("name")} required maxLength={100} autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="notes">
          Notes <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea {...field("notes")} maxLength={1000} rows={3} />
      </div>
      <Button type="submit" size="lg" disabled={flow.submitting}>
        {flow.submitting && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}
