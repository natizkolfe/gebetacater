import Link from "next/link";
import { Button } from "@/components/ui/button";

const WAYS = [
  {
    title: "To-Go Order",
    detail: "Order individual dishes from our available To-Go menu for pickup.",
    href: "/order/to-go",
    cta: "View To-Go Menu",
    image: null as string | null,
  },
  {
    title: "Dabo / Defo",
    detail: "Fresh Habesha bread baked in a 9-inch pan — order it on its own for pickup.",
    href: "/order/dabo-defo",
    cta: "Order Dabo / Defo",
    image: "/dishes/habesha-defo.jpg",
  },
  {
    title: "Agelgel (አገልግል)",
    detail:
      "Experience a traditional Ethiopian way of sharing a complete meal, prepared with Injera and a selection of traditional dishes.",
    href: "/order/agelgel",
    cta: "Build Your Agelgel",
    image: "/dishes/agelgel.png",
  },
] as const;

export function MoreWaysBoard() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {WAYS.map((way) => (
        <article key={way.href} className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
          {way.image ? (
            <div className="mb-4 overflow-hidden rounded-xl border border-border bg-white">
              <img src={way.image} alt="" className="aspect-[4/3] w-full object-cover" />
            </div>
          ) : null}
          <h3 className="font-display text-4xl">{way.title}</h3>
          <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{way.detail}</p>
          <div className="mt-auto pt-6">
            <Button className="h-10 rounded-lg px-3" render={<Link href={way.href} />}>
              {way.cta}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
