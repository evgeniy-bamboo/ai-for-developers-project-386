import { CalendarClock } from "lucide-react";
import { Link, Outlet } from "react-router";

const linkClassName = "text-muted-foreground transition-colors hover:text-foreground";
const rowClassName = "mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:px-6";

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_15%_20%,var(--color-blue-200),transparent_50%),radial-gradient(ellipse_at_85%_0%,var(--color-orange-100),transparent_50%)]">
      <header className="border-b bg-background text-sm">
        <div className={`${rowClassName} justify-between`}>
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <CalendarClock className="size-5 text-primary" aria-hidden="true" />
            Call Calendar
          </Link>
          <nav aria-label="Main">
            <Link to="/book" className={linkClassName}>
              Book a call
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <Outlet />
      </main>
      <footer className="border-t bg-background text-sm">
        <nav aria-label="Footer" className={`${rowClassName} justify-end`}>
          <Link to="/admin" className={linkClassName}>
            Admin
          </Link>
        </nav>
      </footer>
    </div>
  );
}
