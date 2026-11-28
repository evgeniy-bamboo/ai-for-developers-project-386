// PROTOTYPE — throwaway. Floating bar that flips `?variant=`; ← / → keys cycle. Dev builds only.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { useSearchParams } from "react-router";

export function PrototypeSwitcher({
  variants,
  children,
}: {
  variants: { key: string; name: string }[];
  children?: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const current = params.get("variant") ?? variants[0].key;
  const i = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );
  // Switching variant drops the other params, so each variant starts from step 1.
  const go = (d: number) =>
    setParams(
      { variant: variants[(i + d + variants.length) % variants.length].key },
      { replace: true },
    );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest("input, textarea, select, [contenteditable], [role=grid]")
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 text-xs text-zinc-100 shadow-2xl">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous variant"
          onClick={() => go(-1)}
          className="rounded p-1 hover:bg-zinc-700"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-56 text-center font-medium">
          {variants[i].key} ({variants[i].name})
        </span>
        <button
          type="button"
          aria-label="Next variant"
          onClick={() => go(1)}
          className="rounded p-1 hover:bg-zinc-700"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
