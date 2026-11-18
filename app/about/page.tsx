import type { Metadata } from "next";
import { AboutPageView } from "@/components/about-page";
import { normalizeAboutContent } from "@/lib/about-content";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet Weynshet and Tigiest, and learn how Gebeta prepares authentic Ethiopian meals, weekly meal prep, and catering with care.",
};

export default function AboutPage() {
  return <AboutPageView content={normalizeAboutContent(readDb().about)} />;
}
