import type { AboutBlock, AboutFaqItem, AboutPageContent } from "@/lib/types";

export type { AboutBlock, AboutFaqItem, AboutPageContent };

export const defaultAboutContent = (): AboutPageContent => ({
  hero: {
    eyebrow: "About Gebeta",
    title: "Authentic Ethiopian flavors, made with love",
    lede: "From our family kitchen to your table: tradition, care, and home cooked meals made convenient.",
  },
  intro: {
    id: "intro",
    title: "From our family kitchen to your table",
    paragraphs: [
      "At Gebeta, good food is more than a meal. It is tradition, family, culture, and the joy of bringing people together.",
      "We are an Ethiopian catering and meal preparation kitchen. Every dish is made with care so you can enjoy authentic home cooking without spending hours at the stove.",
      "We choose ingredients thoughtfully: fresh vegetables, lentils, grains, seeds, and traditional Ethiopian spices, with organic options when we can. The recipes follow the flavors we grew up with.",
      "Whether you are observing fasting traditions, looking for plant based meals, living alone, or simply too busy to cook, Gebeta prepares fresh meals that fit your week.",
    ],
  },
  cooks: {
    id: "cooks",
    eyebrow: "Meet our cooks",
    title: "Weynshet and Tigiest",
    paragraphs: [
      "Behind Gebeta are two cooks who love Ethiopian food and the craft of preparing it for others.",
      "Both trained in catering schools in Ethiopia and later helped run their family’s home based restaurant, cooking traditional dishes for their community every day.",
      "That practice, meals for family and friends made with patience and attention, is what they bring to Gebeta now: the taste of a family kitchen, shared with you.",
    ],
    closing: "For Weynshet and Tigiest, cooking is not only preparation. It is sharing a piece of home with every order.",
  },
  philosophy: {
    id: "philosophy",
    eyebrow: "Our food philosophy",
    title: "Wholesome ingredients. Traditional recipes. Authentic taste.",
    paragraphs: [
      "Delicious food starts with good ingredients and careful preparation. Our menus lean on lentils, vegetables, grains, seeds, and Ethiopian herbs and spices. The dishes are flavorful, satisfying, and true to home cooking.",
      "We honor Ethiopia’s fasting traditions with plant based dishes that stay full of flavor. From Shiro and Misir Wot to Gomen and other favorites, we make it easier to enjoy the food you love without the daily kitchen work.",
    ],
  },
  mealPrep: {
    id: "meal-prep",
    eyebrow: "Weekly meal prep",
    title: "Home cooked meals without the daily cooking",
    paragraphs: [
      "Life gets busy. Gebeta’s weekly meal preparation is for students, professionals, families, and anyone who wants authentic Ethiopian food ready at home.",
      "Choose portions and dishes that fit your week, including fasting friendly options, so meal planning stays simple.",
    ],
    closing: "Less time cooking. More time enjoying the food you love.",
  },
  catering: {
    id: "catering",
    eyebrow: "Catering",
    title: "Ethiopian hospitality for your table",
    paragraphs: [
      "In Ethiopian culture, food gathers family, friends, and community. We carry that forward for birthdays, celebrations, and everyday gatherings.",
      "Fasting, non fasting, and mixed menus mean there is something for everyone. Every catering order is prepared with the same care we give our own family meals.",
    ],
  },
  mission: {
    id: "mission",
    eyebrow: "Our mission",
    title: "Make authentic Ethiopian home cooking accessible",
    paragraphs: [
      "We offer a convenient alternative to everyday cooking without losing the taste, variety, and tradition that make Ethiopian food special.",
      "Whether you miss the flavors of home, are discovering Ethiopian cuisine, observing a fasting season, or planning the week’s meals, Gebeta is here for you.",
    ],
  },
  tagline: "Gebeta: a taste of home in every bite. Made with love. Rooted in tradition. Prepared for you.",
  faqs: [
    {
      id: "faq-lead-time",
      question: "How far ahead should I order?",
      answer:
        "Weekly meals and catering need advance notice so the kitchen can prepare carefully. The earliest available dates appear on the order page. To Go and some specialty items may have shorter lead times.",
    },
    {
      id: "faq-fasting",
      question: "Do you offer fasting (plant based) meals?",
      answer:
        "Yes. You can order fasting, non fasting, or a mixed package. Fasting dishes follow Ethiopian Orthodox fasting traditions and stay free of meat and dairy.",
    },
    {
      id: "faq-pickup-delivery",
      question: "Is pickup and delivery available?",
      answer:
        "Pickup is available from our Stone Mountain kitchen. Delivery is offered when enabled in kitchen settings, with a per mile fee calculated from your address before you pay.",
    },
    {
      id: "faq-payment",
      question: "When do I pay?",
      answer:
        "Payment clears before the kitchen starts cooking. Once you pay, you receive an order ID that also serves as your pickup verification code.",
    },
    {
      id: "faq-modify",
      question: "Can I change an order after I place it?",
      answer:
        "Paid orders can usually be modified online until the modification window closes, typically within 24 hours of the scheduled date. Open Your orders to see what is still available to change.",
    },
  ],
});

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asParagraphs(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.map((entry) => asString(entry).trim()).filter(Boolean);
  return next.length ? next : fallback;
}

function normalizeBlock(raw: unknown, fallback: AboutBlock): AboutBlock {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    id: asString(source.id, fallback.id),
    eyebrow: asString(source.eyebrow, fallback.eyebrow ?? "") || undefined,
    title: asString(source.title, fallback.title),
    paragraphs: asParagraphs(source.paragraphs, fallback.paragraphs),
    closing: asString(source.closing, fallback.closing ?? "") || undefined,
  };
}

function normalizeFaq(raw: unknown, index: number): AboutFaqItem | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const question = asString(source.question).trim();
  const answer = asString(source.answer).trim();
  if (!question || !answer) return null;
  return {
    id: asString(source.id, `faq_${index + 1}`),
    question,
    answer,
  };
}

/** Merge partial/legacy payloads onto the default About page. */
export function normalizeAboutContent(raw: unknown): AboutPageContent {
  const fallback = defaultAboutContent();
  if (!raw || typeof raw !== "object") return fallback;
  const source = raw as Record<string, unknown>;
  const hero = source.hero && typeof source.hero === "object" ? (source.hero as Record<string, unknown>) : {};
  const faqs = Array.isArray(source.faqs)
    ? source.faqs.map((entry, index) => normalizeFaq(entry, index)).filter((entry): entry is AboutFaqItem => Boolean(entry))
    : fallback.faqs;

  return {
    hero: {
      eyebrow: asString(hero.eyebrow, fallback.hero.eyebrow),
      title: asString(hero.title, fallback.hero.title),
      lede: asString(hero.lede, fallback.hero.lede),
    },
    intro: normalizeBlock(source.intro, fallback.intro),
    cooks: normalizeBlock(source.cooks, fallback.cooks),
    philosophy: normalizeBlock(source.philosophy, fallback.philosophy),
    mealPrep: normalizeBlock(source.mealPrep, fallback.mealPrep),
    catering: normalizeBlock(source.catering, fallback.catering),
    mission: normalizeBlock(source.mission, fallback.mission),
    tagline: asString(source.tagline, fallback.tagline),
    faqs: faqs.length ? faqs : fallback.faqs,
  };
}

export const ABOUT_SECTION_KEYS = ["intro", "cooks", "philosophy", "mealPrep", "catering", "mission"] as const;
export type AboutSectionKey = (typeof ABOUT_SECTION_KEYS)[number];

export const ABOUT_SECTION_LABELS: Record<AboutSectionKey, string> = {
  intro: "Introduction",
  cooks: "Meet our cooks",
  philosophy: "Food philosophy",
  mealPrep: "Weekly meal prep",
  catering: "Catering",
  mission: "Mission",
};

export function paragraphsToText(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export function textToParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
