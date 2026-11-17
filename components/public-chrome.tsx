"use client";

import { usePathname } from "next/navigation";

/** Customer header/footer only — hide on kitchen portal and care sheets. */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/care") || pathname.startsWith("/admin")) return null;
  return children;
}
