import type { Metadata } from "next";
import { AboutPageView } from "@/components/about-page";
import { getAboutContent } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet Weynshet and Tigiest, and learn how Gebeta prepares authentic Ethiopian meals, weekly meal prep, and catering with care.",
};

export default function AboutPage() {
  return <AboutPageView content={getAboutContent()} />;
}
