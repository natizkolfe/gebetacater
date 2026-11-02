import Link from "next/link";
import { leadTimeNotice, publicSettings } from "@/lib/orders";
import { readDb } from "@/lib/store";

const ORDER_LINKS = [
  { href: "/menu", label: "Packages" },
  { href: "/order?kind=weekly", label: "Weekly meal preparation" },
  { href: "/order?kind=catering", label: "Catering by guest count" },
];

export function SiteFooter() {
  const notice = leadTimeNotice(publicSettings(readDb().settings).minimumOrderLeadDays);
  return (
    <footer className="mt-16 border-t border-border print:hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Gebeta</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Ethiopian meals for the week, and catering counted by the guest. Payment clears before anything is cooked.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">A Lulie Tech LLC company</p>
        </div>
        <div className="text-sm leading-6">
          <p className="font-medium">Kitchen</p>
          <p className="text-muted-foreground">4473 Rowland N Dr, Stone Mountain, GA 30083</p>
          <p className="text-muted-foreground">{notice}</p>
          <Link href="/admin" className="mt-2 inline-block text-primary">
            Staff entrance
          </Link>
        </div>
        <div className="text-sm leading-6">
          <p className="font-medium">Order</p>
          <div className="grid text-muted-foreground">
            {ORDER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Lulie Tech LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
