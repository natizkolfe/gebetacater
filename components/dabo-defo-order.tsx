"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { DishPhoto } from "@/components/dish-photo";
import { PageIntro, Shell } from "@/components/page-intro";
import { useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { availableDaboDefoOptions, daboDefoDraftLine } from "@/lib/dabo-defo";
import { money } from "@/lib/format";
import { DABO_DEFO_LEAD_DAYS, defaultDraft, leadTimeNotice } from "@/lib/orders";
import type { PublicSettings } from "@/lib/types";

export function DaboDefoOrder() {
  const router = useRouter();
  const { draft, hydrated, setDraft } = useDraft();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const options = availableDaboDefoOptions();
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "habesha-defo");
  const [quantity, setQuantity] = useState(1);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("12:00");
  const [error, setError] = useState("");
  const selected = options.find((item) => item.id === selectedId) ?? options[0];

  useEffect(() => {
    api<{ settings: PublicSettings }>("/api/settings")
      .then((data) => {
        setSettings(data.settings);
        setPickupDate(data.settings.earliestDaboDefoDate);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!hydrated || !settings) return;
    if (draft?.kind === "dabo_defo") {
      setPickupDate(draft.eventDate || settings.earliestDaboDefoDate);
      setPickupTime(draft.eventTime || "12:00");
      const line = draft.lines[0];
      if (line) {
        setSelectedId(line.itemId);
        setQuantity(line.quantity);
      }
      return;
    }
    setDraft(defaultDraft(settings, "dabo_defo"));
  }, [hydrated, settings, draft?.kind, setDraft]);

  function continueOrder() {
    if (!settings || !selected) return;
    if (quantity < 1) {
      setError("Choose at least one Dabo / Defo.");
      return;
    }
    const base = draft?.kind === "dabo_defo" ? draft : defaultDraft(settings, "dabo_defo");
    setDraft({
      ...base,
      kind: "dabo_defo",
      fulfillment: "pickup",
      fastingPreference: "fasting",
      eventDate: pickupDate,
      eventTime: pickupTime,
      delivery: null,
      address: "",
      lines: [daboDefoDraftLine(selected.id, quantity)],
    });
    router.push("/order/review");
  }

  if (!settings || !selected) {
    return (
      <Shell>
        <p className="text-muted-foreground">{error || "Loading Dabo / Defo…"}</p>
      </Shell>
    );
  }

  return (
    <Shell className="max-w-2xl">
      <PageIntro
        eyebrow="Dabo / Defo"
        title="Habesha Dabo / Defo"
        lede="Freshly baked Habesha bread in a 9-inch pan. Order it on its own — no weekly meal or catering package required."
      />

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium">Pickup</p>
        <p className="mt-1 text-sm text-muted-foreground">{settings.pickupAddress}</p>
        <p className="mt-1 text-xs text-muted-foreground">{leadTimeNotice(DABO_DEFO_LEAD_DAYS)}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="dabo-date">Pickup date</Label>
            <Input
              id="dabo-date"
              type="date"
              className="h-11 bg-background px-3"
              min={settings.earliestDaboDefoDate}
              value={pickupDate}
              onChange={(event) => setPickupDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dabo-time">Pickup time</Label>
            <Input
              id="dabo-time"
              type="time"
              className="h-11 bg-background px-3"
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
            />
          </div>
        </div>
      </div>

      <article className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap gap-4">
          {selected.imageId ? <DishPhoto id={selected.imageId} size="md" /> : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-3xl">{selected.name}</h2>
            {selected.sizeLabel ? (
              <p className="mt-1 text-sm font-medium text-primary">{selected.sizeLabel}</p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.description}</p>
            <p className="mt-3 text-lg font-medium">{money(selected.price)} each</p>
            {selected.placeholder ? (
              <p className="mt-2 text-xs uppercase tracking-wide text-amber-800">Temporary placeholder price</p>
            ) : null}
          </div>
        </div>

        {options.length > 1 ? (
          <div className="mt-4 grid gap-2">
            <Label>Option</Label>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm ${
                    selectedId === option.id ? "bg-primary text-primary-foreground" : "border border-border bg-background"
                  }`}
                  onClick={() => setSelectedId(option.id)}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex size-11 items-center justify-center rounded-lg border border-input bg-background"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-sm tabular-nums">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex size-11 items-center justify-center rounded-lg border border-input bg-background"
              onClick={() => setQuantity((value) => Math.min(50, value + 1))}
            >
              <Plus className="size-4" />
            </button>
          </div>
          <Button type="button" className="h-11 px-4" onClick={continueOrder}>
            Add to Order
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </article>
    </Shell>
  );
}
