import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty.tsx";

/** Takes up the whole page and links back to the home page. */
export function PageMessage({ title, text }: { title: string; text: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          <h1 className="text-3xl font-bold">{title}</h1>
        </EmptyTitle>
        <EmptyDescription className="text-base text-foreground/70">{text}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Back to home
        </Link>
      </EmptyContent>
    </Empty>
  );
}
