// PROTOTYPE (wayfinder ticket #5): three variants of the /book flow on the real route, switchable
// via `?variant=A|B|C`. Mock data only; the bar also sets what the next booking request returns.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { PrototypeSwitcher } from "@/components/prototype-switcher.tsx";
import { ControlsContext } from "./book-prototype/flow.tsx";
import { resetMock, type Scenario, scenarios } from "./book-prototype/mock.ts";
import * as A from "./book-prototype/variant-a.tsx";
import * as B from "./book-prototype/variant-b.tsx";
import * as C from "./book-prototype/variant-c.tsx";

const variants = [
  { key: "A", name: A.name, Component: A.VariantA },
  { key: "B", name: B.name, Component: B.VariantB },
  { key: "C", name: C.name, Component: C.VariantC },
];

export function BookPage() {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  const [params] = useSearchParams();
  const [scenario, setScenario] = useState<Scenario>("ok");
  const [empty, setEmpty] = useState(false);
  const [debug, setDebug] = useState("");
  const v = variants.find((x) => x.key === params.get("variant")) ?? variants[0];

  return (
    <QueryClientProvider client={qc}>
      <title>Book a call · Call Calendar</title>
      <ControlsContext
        value={{
          scenario,
          consumeScenario: () => setScenario("ok"),
          report: (s) => setDebug(JSON.stringify(s)),
        }}
      >
        <v.Component key={v.key} />
      </ControlsContext>
      <div className="h-32" />
      <PrototypeSwitcher variants={variants}>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <label className="flex items-center gap-1">
            Next booking →
            <select
              value={scenario}
              onChange={(e) => setScenario(scenarios.find((s) => s === e.target.value) ?? "ok")}
              className="rounded bg-zinc-800 px-1 py-0.5"
            >
              {scenarios.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={empty}
              onChange={(e) => {
                setEmpty(e.target.checked);
                resetMock({ empty: e.target.checked });
                void qc.resetQueries();
              }}
            />
            no event types
          </label>
        </div>
        <code className="max-w-xl truncate text-[10px] text-zinc-400" title={debug}>
          {debug}
        </code>
      </PrototypeSwitcher>
    </QueryClientProvider>
  );
}
