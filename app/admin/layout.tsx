import type { Metadata } from "next";
import { KitchenFrame } from "@/components/kitchen";

export const metadata: Metadata = {
  title: "Kitchen",
  robots: { index: false, follow: false },
};

/** Staff portal — not linked from the customer storefront / app. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <KitchenFrame>{children}</KitchenFrame>;
}
