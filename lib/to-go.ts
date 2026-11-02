import type { Customization, DraftLine } from "@/lib/types";

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

/** Categories the To-Go menu can show. Admin can grow this list later. */
export type ToGoCategory = "fasting" | "non_fasting" | "dabo_bread" | "extras";

export interface ToGoItem {
  id: string;
  name: string;
  description: string;
  category: ToGoCategory;
  /** Temporary price until the real To-Go menu is provided. */
  price: number;
  /** Always true for seed placeholders so they are easy to replace. */
  placeholder: boolean;
  available: boolean;
}

export const TO_GO_CATEGORY_LABEL: Record<ToGoCategory, string> = {
  fasting: "Fasting",
  non_fasting: "Non-Fasting",
  dabo_bread: "Dabo / Bread",
  extras: "Extras",
};

/**
 * Placeholder To-Go catalog only.
 * Replace these rows when the final menu and prices are ready.
 * Do not treat names or prices as permanent.
 */
export const TO_GO_PLACEHOLDERS: ToGoItem[] = [
  {
    id: "togo-placeholder-fasting-1",
    name: "Placeholder Fasting Item",
    description: "Description placeholder. Replace with the approved fasting To-Go dish.",
    category: "fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "togo-placeholder-non-fasting-1",
    name: "Placeholder Non-Fasting Item",
    description: "Description placeholder. Replace with the approved non-fasting To-Go dish.",
    category: "non_fasting",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "togo-placeholder-bread-1",
    name: "Placeholder Dabo / Bread",
    description: "Description placeholder. Replace with the approved bread item for To-Go.",
    category: "dabo_bread",
    price: 0,
    placeholder: true,
    available: true,
  },
  {
    id: "togo-placeholder-extra-1",
    name: "Placeholder Extra",
    description: "Description placeholder. Replace with the approved To-Go extra.",
    category: "extras",
    price: 0,
    placeholder: true,
    available: true,
  },
];

const BY_ID = new Map(TO_GO_PLACEHOLDERS.map((item) => [item.id, item]));

export function toGoItem(id: string): ToGoItem | null {
  return BY_ID.get(id) ?? null;
}

export function toGoCategories(): ToGoCategory[] {
  return (Object.keys(TO_GO_CATEGORY_LABEL) as ToGoCategory[]).filter((category) =>
    TO_GO_PLACEHOLDERS.some((item) => item.available && item.category === category),
  );
}

export function toGoItemsIn(category: ToGoCategory): ToGoItem[] {
  return TO_GO_PLACEHOLDERS.filter((item) => item.available && item.category === category);
}

export function toGoDraftLine(itemId: string, quantity: number): DraftLine {
  return {
    lineId: `ln_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    itemId,
    quantity,
    dayIndex: null,
    mealSlot: null,
    customization: blankCustomization(),
    source: "included",
    portionId: null,
  };
}
