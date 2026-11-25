import { PageMessage } from "@/components/page-message.tsx";

export function NotFoundPage() {
  return (
    <>
      <title>Page not found · Call Calendar</title>
      <PageMessage title="Page not found" text="There is no page at this address." />
    </>
  );
}
