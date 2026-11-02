import type { Customization, DraftLine, FastingPreference } from "@/lib/types";

function blankCustomization(): Customization {
  return {
    spiceLevel: null,
    allergens: [],
    excludedIngredients: [],
    preferredIngredients: [],
    dietary: [],
    fastingStyle: null,
    choice: null,
    sauces: [],
    extras: [],
    notes: "",
  };
}

/** Categories the Agelgel builder can show. Admin can grow this list later. */
export type AgelgelCategory = "fasting" | "non_fasting" | "extras";

export interface AgelgelItem {
  id: string;
  name: string;
  description: string;
  category: AgelgelCategory;
  /** Temporary until the real Agelgel menu and prices are provided. */
  price: number;
  placeholder: boolean;
  available: boolean;
}

export const AGELGEL_CATEGORY_LABEL: Record<AgelgelCategory, string> = {
  fasting: "Fasting Selections",
  non_fasting: "Non-Fasting Selections",
  extras: "Extras",
};

export const AGELGEL_INJERA_ID = "agelgel-injera";

export const AGELGEL_INJERA = {
  id: AGELGEL_INJERA_ID,
  name: "Injera",
  description: "Number of Injera for this Agelgel.",
  price: 0,
  placeholder: true,
  available: true,
} as const;

/**
 * Placeholder Agelgel catalog only.
 * Replace these rows when the final menu and prices are ready.
 * Do not treat names or prices as permanent.
 */
export const AGELGEL_PLACEHOLDERS: AgelgelItem[] = [
  {
    id: "agelgel-placeholder-fasting-1",
    name: "Placeholder Fasting Dish",
    description: "Description placeholder. Replace with an approved fasting Agelgel dish.",
    category: "fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "agelgel-placeholder-fasting-2",
    name: "Placeholder Fasting Dish",
    description: "Description placeholder. Replace with an approved fasting Agelgel dish.",
    category: "fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "agelgel-placeholder-fasting-3",
    name: "Placeholder Fasting Dish",
    description: "Description placeholder. Replace with an approved fasting Agelgel dish.",
    category: "fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "agelgel-placeholder-non-fasting-1",
    name: "Placeholder Non-Fasting Dish",
    description: "Description placeholder. Replace with an approved non-fasting Agelgel dish.",
    category: "non_fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "agelgel-placeholder-non-fasting-2",
    name: "Placeholder Non-Fasting Dish",
    description: "Description placeholder. Replace with an approved non-fasting Agelgel dish.",
    category: "non_fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "agelgel-placeholder-non-fasting-3",
    name: "Placeholder Non-Fasting Dish",
    description: "Description placeholder. Replace with an approved non-fasting Agelgel dish.",
    category: "non_fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "agelgel-placeholder-extra-1",
    name: "Placeholder Extra",
    description: "Description placeholder. Replace with an approved Agelgel extra.",
    category: "extras",
    price: 0,
    placeholder: true,
    available: true,
  },
];

const BY_ID = new Map(AGELGEL_PLACEHOLDERS.map((item) => [item.id, item]));

export const AGELGEL_MIN_PEOPLE = 1;
export const AGELGEL_MAX_PEOPLE = 100;
export const AGELGEL_DEFAULT_PEOPLE = 4;
export const AGELGEL_DEFAULT_INJERA = 5;
export const AGELGEL_MAX_INJERA = 100;

export function agelgelItem(id: string): AgelgelItem | null {
  return BY_ID.get(id) ?? null;
}

export function agelgelItemsIn(category: AgelgelCategory): AgelgelItem[] {
  return AGELGEL_PLACEHOLDERS.filter((item) => item.available && item.category === category);
}

/** Categories visible for the chosen Fasting / Non-Fasting / Mixed style. */
export function agelgelFoodCategories(preference: FastingPreference): AgelgelCategory[] {
  if (preference === "fasting") return ["fasting"];
  if (preference === "non_fasting") return ["non_fasting"];
  return ["fasting", "non_fasting"];
}

export function agelgelDraftLine(itemId: string, quantity: number, source: "included" | "addon" = "included"): DraftLine {
  return {
    lineId: `ln_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    itemId,
    quantity,
    dayIndex: null,
    mealSlot: null,
    customization: blankCustomization(),
    source,
    portionId: null,
  };
}

export function agelgelInjeraLine(quantity: number): DraftLine {
  return agelgelDraftLine(AGELGEL_INJERA_ID, quantity, "included");
}

/**
 * Future hook: recommend Injera from guest count.
 * Returns null until the kitchen formula is provided — customers still set Injera manually.
 */
export function recommendedInjera(_people: number): number | null {
  return null;
}

/** Display price until real Agelgel pricing lands. */
export function agelgelPriceLabel(price: number): string {
  return price > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price) : "$XX.XX";
}

export function resolveAgelgelUnit(itemId: string): { name: string; price: number; placeholder: boolean; category: AgelgelCategory | "injera" } | null {
  if (itemId === AGELGEL_INJERA_ID) {
    return { name: AGELGEL_INJERA.name, price: AGELGEL_INJERA.price, placeholder: AGELGEL_INJERA.placeholder, category: "injera" };
  }
  const item = agelgelItem(itemId);
  if (!item) return null;
  return { name: item.name, price: item.price, placeholder: item.placeholder, category: item.category };
}

export function agelgelLinesSubtotal(lines: { itemId: string; quantity: number }[]): number {
  return lines.reduce((sum, line) => {
    const unit = resolveAgelgelUnit(line.itemId)?.price ?? 0;
    return sum + unit * line.quantity;
  }, 0);
}
