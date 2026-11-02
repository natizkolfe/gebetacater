import { HABESHA_DEFO_PRICE } from "@/lib/portions";
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

/**
 * Standalone Dabo / Defo catalog.
 * Structured for future sizes, types, and prices — only one product is shown for now.
 */
export interface DaboDefoOption {
  id: string;
  name: string;
  description: string;
  price: number;
  /** When true, treat as temporary until kitchen confirms. */
  placeholder: boolean;
  available: boolean;
  sizeLabel?: string;
  imageId?: string;
}

export const DABO_DEFO_OPTIONS: DaboDefoOption[] = [
  {
    id: "habesha-defo",
    name: "Habesha Dabo / Defo",
    description: "Freshly baked Habesha bread in a 9-inch pan. Order on its own for pickup.",
    price: HABESHA_DEFO_PRICE,
    placeholder: false,
    available: true,
    sizeLabel: "9-inch pan",
    imageId: "habesha-defo",
  },
];

const BY_ID = new Map(DABO_DEFO_OPTIONS.map((item) => [item.id, item]));

export function daboDefoOption(id: string): DaboDefoOption | null {
  return BY_ID.get(id) ?? null;
}

export function availableDaboDefoOptions(): DaboDefoOption[] {
  return DABO_DEFO_OPTIONS.filter((item) => item.available);
}

export function daboDefoDraftLine(itemId: string, quantity: number): DraftLine {
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
