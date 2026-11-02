"use client";

import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AGELGEL_CATEGORY_LABEL,
  AGELGEL_DEFAULT_INJERA,
  AGELGEL_DEFAULT_PEOPLE,
  AGELGEL_INJERA_ID,
  AGELGEL_MAX_INJERA,
  AGELGEL_MAX_PEOPLE,
  AGELGEL_MIN_PEOPLE,
  agelgelDraftLine,
  agelgelFoodCategories,
  agelgelInjeraLine,
  agelgelItem,
  agelgelItemsIn,
  agelgelLinesSubtotal,
  agelgelPriceLabel,
  recommendedInjera,
  type AgelgelCategory,
} from "@/lib/agelgel";
import { api } from "@/lib/client-api";
import { FASTING_LABEL } from "@/lib/format";
import { defaultDraft, leadTimeNotice } from "@/lib/orders";
import type { FastingPreference, PublicSettings } from "@/lib/types";

const MEAL_STYLES: FastingPreference[] = ["fasting", "non_fasting", "mixed"];

export function AgelgelOrder() {
  const router = useRouter();
  const { draft, hydrated, setDraft } = useDraft();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [people, setPeople] = useState(AGELGEL_DEFAULT_PEOPLE);
  const [injera, setInjera] = useState(AGELGEL_DEFAULT_INJERA);
  const [preference, setPreference] = useState<FastingPreference>("mixed");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [extras, setExtras] = useState<Record<string, boolean>>({});
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("12:00");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ settings: PublicSettings }>("/api/settings")
      .then((data) => {
        setSettings(data.settings);
        setEventDate(data.settings.earliestCateringDate);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!hydrated || !settings) return;
    if (draft?.kind === "agelgel") {
      setPeople(draft.guestCount || AGELGEL_DEFAULT_PEOPLE);
      setPreference(draft.fastingPreference);
      setEventDate(draft.eventDate || settings.earliestCateringDate);
      setEventTime(draft.eventTime || "12:00");
      const nextFood: Record<string, boolean> = {};
      const nextExtras: Record<string, boolean> = {};
      let nextInjera = AGELGEL_DEFAULT_INJERA;
      for (const line of draft.lines) {
        if (line.itemId === AGELGEL_INJERA_ID) {
          nextInjera = line.quantity;
          continue;
        }
        if (line.source === "addon") nextExtras[line.itemId] = true;
        else nextFood[line.itemId] = true;
      }
      setInjera(nextInjera);
      setSelected(nextFood);
      setExtras(nextExtras);
      return;
    }
    setDraft({
      ...defaultDraft(settings, "agelgel"),
      guestCount: AGELGEL_DEFAULT_PEOPLE,
      fastingPreference: "mixed",
    });
  }, [hydrated, settings, draft?.kind, setDraft]);

  const foodCategories = useMemo(() => agelgelFoodCategories(preference), [preference]);
  const suggested = recommendedInjera(people);
  const foodIds = Object.entries(selected)
    .filter(([, on]) => on)
    .map(([id]) => id);
  const extraIds = Object.entries(extras)
    .filter(([, on]) => on)
    .map(([id]) => id);
  const previewLines = [
    { itemId: AGELGEL_INJERA_ID, quantity: injera },
    ...foodIds.map((id) => ({ itemId: id, quantity: 1 })),
    ...extraIds.map((id) => ({ itemId: id, quantity: 1 })),
  ];
  const estimated = agelgelLinesSubtotal(previewLines);

  function clampPeople(value: number) {
    return Math.max(AGELGEL_MIN_PEOPLE, Math.min(AGELGEL_MAX_PEOPLE, value));
  }

  function clampInjera(value: number) {
    return Math.max(1, Math.min(AGELGEL_MAX_INJERA, value));
  }

  function toggleFood(id: string) {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  }

  function toggleExtra(id: string) {
    setExtras((current) => ({ ...current, [id]: !current[id] }));
  }

  function continueOrder() {
    if (!settings) return;
    if (foodIds.length === 0) {
      setError("Choose at least one Agelgel food selection.");
      return;
    }
    if (injera < 1) {
      setError("Choose how many Injera you would like.");
      return;
    }
    if (!eventDate) {
      setError("Choose when you need your Agelgel.");
      return;
    }
    const base = draft?.kind === "agelgel" ? draft : defaultDraft(settings, "agelgel");
    setDraft({
      ...base,
      kind: "agelgel",
      guestCount: people,
      fastingPreference: preference,
      eventDate,
      eventTime,
      lines: [
        agelgelInjeraLine(injera),
        ...foodIds.map((id) => agelgelDraftLine(id, 1, "included")),
        ...extraIds.map((id) => agelgelDraftLine(id, 1, "addon")),
      ],
    });
    router.push("/order/review");
  }

  if (!settings) {
    return (
      <Shell>
        <p className="text-muted-foreground">{error || "Loading Agelgel…"}</p>
      </Shell>
    );
  }

  return (
    <Shell className="max-w-3xl">
      <PageIntro
        eyebrow="Agelgel"
        title="Agelgel (አገልግል)"
        lede="A traditional Ethiopian meal-sharing experience. Agelgel brings together Injera and a selection of traditional Ethiopian dishes into one shared meal. Customize based on the number of people, Injera, and your preferred food selections."
      />
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
        <img src="/dishes/agelgel.png" alt="" className="mx-auto max-h-64 w-full object-contain p-4" />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">How Many People Are You Serving?</h2>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease people"
            className="flex size-11 items-center justify-center rounded-lg border border-input bg-background"
            onClick={() => setPeople((value) => clampPeople(value - 1))}
          >
            <Minus className="size-4" />
          </button>
          <Input
            type="number"
            inputMode="numeric"
            className="h-11 w-20 bg-background px-3 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={people}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isInteger(next)) setPeople(clampPeople(next));
            }}
          />
          <button
            type="button"
            aria-label="Increase people"
            className="flex size-11 items-center justify-center rounded-lg border border-input bg-background"
            onClick={() => setPeople((value) => clampPeople(value + 1))}
          >
            <Plus className="size-4" />
          </button>
        </div>
        {suggested != null ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Serving {people} people · Recommended Injera: {suggested}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Serving {people} people</p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Agelgel Style</h2>
        <p className="mt-2 text-sm text-muted-foreground">Choose Fasting, Non-Fasting, or Mixed.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MEAL_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${
                preference === style ? "bg-primary text-primary-foreground" : "border border-border bg-background"
              }`}
              onClick={() => setPreference(style)}
            >
              {FASTING_LABEL[style]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">How Many Injera Would You Like?</h2>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease Injera"
            className="flex size-11 items-center justify-center rounded-lg border border-input bg-background"
            onClick={() => setInjera((value) => clampInjera(value - 1))}
          >
            <Minus className="size-4" />
          </button>
          <Input
            type="number"
            inputMode="numeric"
            className="h-11 w-20 bg-background px-3 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={injera}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isInteger(next)) setInjera(clampInjera(next));
            }}
          />
          <button
            type="button"
            aria-label="Increase Injera"
            className="flex size-11 items-center justify-center rounded-lg border border-input bg-background"
            onClick={() => setInjera((value) => clampInjera(value + 1))}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-3xl">Build Your Agelgel</h2>
        <p className="mt-2 text-sm text-muted-foreground">Menu items are placeholders until the final Agelgel menu is ready.</p>

        {foodCategories.map((category) => (
          <FoodGroup
            key={category}
            category={category}
            selected={selected}
            onToggle={toggleFood}
          />
        ))}

        <FoodGroup category="extras" selected={extras} onToggle={toggleExtra} />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">When do you need it?</h2>
        <p className="mt-1 text-xs text-muted-foreground">{leadTimeNotice(settings.minimumOrderLeadDays)}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="agelgel-date">Order date</Label>
            <Input
              id="agelgel-date"
              type="date"
              className="h-11 bg-background px-3"
              min={settings.earliestCateringDate}
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agelgel-time">Time</Label>
            <Input
              id="agelgel-time"
              type="time"
              className="h-11 bg-background px-3"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Your Agelgel</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Serving</dt>
            <dd>
              {people} {people === 1 ? "Person" : "People"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Style</dt>
            <dd>{FASTING_LABEL[preference]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Injera</dt>
            <dd>{injera}</dd>
          </div>
        </dl>

        <h3 className="mt-5 text-xs tracking-[0.14em] text-primary uppercase">Selected Foods</h3>
        {foodIds.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None yet</p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm">
            {foodIds.map((id) => (
              <li key={id}>✓ {agelgelItem(id)?.name ?? id}</li>
            ))}
          </ul>
        )}

        <h3 className="mt-5 text-xs tracking-[0.14em] text-primary uppercase">Extras</h3>
        {extraIds.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None</p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm">
            {extraIds.map((id) => (
              <li key={id}>✓ {agelgelItem(id)?.name ?? id}</li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">Estimated Total</p>
          <p className="font-display text-3xl">{agelgelPriceLabel(estimated)}</p>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button type="button" className="mt-4 h-11 px-4" onClick={continueOrder}>
          Continue
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Next you will choose pickup or delivery.</p>
      </section>
    </Shell>
  );
}

function FoodGroup({
  category,
  selected,
  onToggle,
}: {
  category: AgelgelCategory;
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const items = agelgelItemsIn(category);
  if (items.length === 0) return null;
  return (
    <div className="mt-5 rounded-xl border border-border bg-card p-5">
      <h3 className="font-display text-2xl">{AGELGEL_CATEGORY_LABEL[category]}</h3>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => {
          const checked = Boolean(selected[item.id]);
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={checked}
                  onChange={() => onToggle(item.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
                  {item.placeholder ? (
                    <span className="mt-2 block text-xs uppercase tracking-wide text-amber-800">Placeholder menu item</span>
                  ) : null}
                </span>
                <span className="text-sm tabular-nums">{agelgelPriceLabel(item.price)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
