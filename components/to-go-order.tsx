"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { money } from "@/lib/format";
import { defaultDraft, leadTimeNotice } from "@/lib/orders";
import {
  TO_GO_CATEGORY_LABEL,
  toGoCategories,
  toGoDraftLine,
  toGoItem,
  toGoItemsIn,
  type ToGoCategory,
} from "@/lib/to-go";
import type { PublicSettings } from "@/lib/types";

export function ToGoOrder() {
  const router = useRouter();
  const { draft, hydrated, setDraft } = useDraft();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [category, setCategory] = useState<ToGoCategory>("fasting");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("12:00");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ settings: PublicSettings }>("/api/settings")
      .then((data) => {
        setSettings(data.settings);
        setPickupDate(data.settings.earliestCateringDate);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!hydrated || !settings) return;
    if (draft?.kind === "to_go") {
      setPickupDate(draft.eventDate || settings.earliestCateringDate);
      setPickupTime(draft.eventTime || "12:00");
      const next: Record<string, number> = {};
      for (const line of draft.lines) next[line.itemId] = line.quantity;
      setQty(next);
      return;
    }
    setDraft(defaultDraft(settings, "to_go"));
  }, [hydrated, settings, draft?.kind, setDraft]);

  const categories = useMemo(() => toGoCategories(), []);
  const items = toGoItemsIn(category);
  const cartCount = Object.values(qty).reduce((sum, value) => sum + (value > 0 ? value : 0), 0);

  function setItemQty(id: string, value: number) {
    setQty((current) => ({ ...current, [id]: Math.max(0, Math.min(50, value)) }));
  }

  function continueOrder() {
    if (!settings) return;
    const lines = Object.entries(qty)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => toGoDraftLine(itemId, quantity));
    if (lines.length === 0) {
      setError("Add at least one To-Go item.");
      return;
    }
    const base = draft?.kind === "to_go" ? draft : defaultDraft(settings, "to_go");
    setDraft({
      ...base,
      kind: "to_go",
      fulfillment: "pickup",
      fastingPreference: "mixed",
      eventDate: pickupDate,
      eventTime: pickupTime,
      delivery: null,
      address: "",
      lines,
    });
    router.push("/order/review");
  }

  if (!settings) {
    return (
      <Shell>
        <p className="text-muted-foreground">{error || "Loading the To-Go menu…"}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageIntro
        eyebrow="To-Go"
        title="To-Go Menu"
        lede="Choose from our available menu and place an order for pickup. This is not a weekly meal plan or catering order."
      />

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium">Pickup</p>
        <p className="mt-1 text-sm text-muted-foreground">{settings.pickupAddress}</p>
        <p className="mt-1 text-xs text-muted-foreground">{leadTimeNotice(settings.minimumOrderLeadDays)}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="togo-date">Pickup date</Label>
            <Input
              id="togo-date"
              type="date"
              className="h-11 bg-background px-3"
              min={settings.earliestCateringDate}
              value={pickupDate}
              onChange={(event) => setPickupDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="togo-time">Pickup time</Label>
            <Input
              id="togo-time"
              type="time"
              className="h-11 bg-background px-3"
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm ${
              category === id ? "bg-primary text-primary-foreground" : "border border-border bg-card"
            }`}
            onClick={() => setCategory(id)}
          >
            {TO_GO_CATEGORY_LABEL[id]}
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-3">
        {items.map((item) => {
          const quantity = qty[item.id] ?? 0;
          return (
            <li key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  {item.placeholder ? (
                    <p className="mt-2 text-xs uppercase tracking-wide text-amber-800">Placeholder menu item</p>
                  ) : null}
                </div>
                <p className="text-sm font-medium">{item.price > 0 ? money(item.price) : "Price TBD"}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name}`}
                    className="flex size-10 items-center justify-center rounded-lg border border-input bg-background"
                    onClick={() => setItemQty(item.id, quantity - 1)}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${item.name}`}
                    className="flex size-10 items-center justify-center rounded-lg border border-input bg-background"
                    onClick={() => setItemQty(item.id, quantity + 1)}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 bg-background px-3"
                  onClick={() => setItemQty(item.id, Math.max(1, quantity))}
                >
                  Add to Order
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button type="button" className="h-11 px-4" disabled={cartCount === 0} onClick={continueOrder}>
          Review order ({cartCount})
        </Button>
        <p className="text-sm text-muted-foreground">
          {Object.entries(qty)
            .filter(([, value]) => value > 0)
            .map(([id, value]) => `${value}× ${toGoItem(id)?.name ?? id}`)
            .join(" · ") || "No items yet"}
        </p>
      </div>
    </Shell>
  );
}
