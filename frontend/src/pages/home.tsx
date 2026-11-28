import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

export function HomePage() {
  return (
    <>
      <title>Call Calendar</title>
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col items-start gap-5">
          <Badge variant="outline" className="bg-background">
            Quick call booking
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Call Calendar</h1>
          <p className="text-lg text-foreground/70">
            Pick a time that suits you and book a call in a few clicks.
          </p>
          <Link to="/book" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
            Book a call
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-semibold">How it works</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-base">
            <ol className="flex list-decimal flex-col gap-2 pl-5 marker:text-muted-foreground">
              <li>Choose the kind of call you need.</li>
              <li>Pick a free slot, shown in your local time.</li>
              <li>Enter your name and email to confirm.</li>
            </ol>
            <p className="text-foreground/70">No registration needed.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
