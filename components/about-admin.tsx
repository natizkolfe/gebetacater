"use client";

import { useEffect, useState } from "react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ABOUT_SECTION_KEYS,
  ABOUT_SECTION_LABELS,
  paragraphsToText,
  textToParagraphs,
  type AboutPageContent,
  type AboutSectionKey,
} from "@/lib/about-content";
import { api } from "@/lib/client-api";

function blankFaq() {
  return {
    id: `faq_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
    question: "",
    answer: "",
  };
}

export function AboutAdmin() {
  const [draft, setDraft] = useState<AboutPageContent | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ about: AboutPageContent }>("/api/admin/about")
      .then((data) => setDraft(data.about))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  function updateHero(field: "eyebrow" | "title" | "lede", value: string) {
    setDraft((current) => (current ? { ...current, hero: { ...current.hero, [field]: value } } : current));
  }

  function updateSection(
    key: AboutSectionKey,
    field: "eyebrow" | "title" | "closing" | "paragraphsText",
    value: string,
  ) {
    setDraft((current) => {
      if (!current) return current;
      const section = current[key];
      if (field === "paragraphsText") {
        return { ...current, [key]: { ...section, paragraphs: textToParagraphs(value) } };
      }
      return { ...current, [key]: { ...section, [field]: value } };
    });
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    setDraft((current) => {
      if (!current) return current;
      const faqs = current.faqs.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry));
      return { ...current, faqs };
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const cleaned: AboutPageContent = {
        ...draft,
        faqs: draft.faqs
          .map((entry) => ({
            ...entry,
            question: entry.question.trim(),
            answer: entry.answer.trim(),
          }))
          .filter((entry) => entry.question && entry.answer),
      };
      const data = await api<{ about: AboutPageContent }>("/api/admin/about", {
        method: "PUT",
        body: JSON.stringify({ about: cleaned }),
      });
      setDraft(data.about);
      setMessage("About page saved. Customers see the new wording on /about.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the About page.");
    } finally {
      setPending(false);
    }
  }

  if (!draft) {
    return <p className="text-muted-foreground">{error || "Loading About page…"}</p>;
  }

  return (
    <div>
      <PageIntro
        eyebrow="Site content"
        title="About page"
        lede="Edit the story, cook bios, mission, and FAQ that customers see on /about."
      />
      <form className="mt-8 grid gap-8" onSubmit={save}>
        <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl">Hero</h2>
          <Label htmlFor="about-eyebrow">Eyebrow</Label>
          <Input
            id="about-eyebrow"
            className="h-11 bg-background px-3"
            value={draft.hero.eyebrow}
            onChange={(event) => updateHero("eyebrow", event.target.value)}
          />
          <Label htmlFor="about-title">Title</Label>
          <Input
            id="about-title"
            className="h-11 bg-background px-3"
            value={draft.hero.title}
            onChange={(event) => updateHero("title", event.target.value)}
          />
          <Label htmlFor="about-lede">Supporting sentence</Label>
          <Textarea
            id="about-lede"
            className="min-h-20 bg-background"
            value={draft.hero.lede}
            onChange={(event) => updateHero("lede", event.target.value)}
          />
        </section>

        {ABOUT_SECTION_KEYS.map((key) => {
          const section = draft[key];
          return (
            <section key={key} className="grid gap-3 rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-2xl">{ABOUT_SECTION_LABELS[key]}</h2>
              <Label htmlFor={`${key}-eyebrow`}>Eyebrow</Label>
              <Input
                id={`${key}-eyebrow`}
                className="h-11 bg-background px-3"
                value={section.eyebrow ?? ""}
                onChange={(event) => updateSection(key, "eyebrow", event.target.value)}
              />
              <Label htmlFor={`${key}-title`}>Title</Label>
              <Input
                id={`${key}-title`}
                className="h-11 bg-background px-3"
                value={section.title}
                onChange={(event) => updateSection(key, "title", event.target.value)}
              />
              <Label htmlFor={`${key}-paragraphs`}>Paragraphs</Label>
              <p className="text-xs text-muted-foreground">Separate paragraphs with a blank line.</p>
              <Textarea
                id={`${key}-paragraphs`}
                className="min-h-40 bg-background"
                value={paragraphsToText(section.paragraphs)}
                onChange={(event) => updateSection(key, "paragraphsText", event.target.value)}
              />
              <Label htmlFor={`${key}-closing`}>Closing line (optional)</Label>
              <Input
                id={`${key}-closing`}
                className="h-11 bg-background px-3"
                value={section.closing ?? ""}
                onChange={(event) => updateSection(key, "closing", event.target.value)}
              />
            </section>
          );
        })}

        <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl">Closing tagline</h2>
          <Label htmlFor="about-tagline">Tagline</Label>
          <Textarea
            id="about-tagline"
            className="min-h-20 bg-background"
            value={draft.tagline}
            onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
          />
        </section>

        <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">FAQ</h2>
            <Button
              type="button"
              variant="outline"
              className="h-10 bg-background"
              onClick={() => setDraft({ ...draft, faqs: [...draft.faqs, blankFaq()] })}
            >
              Add question
            </Button>
          </div>
          {draft.faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No FAQ items yet. Add a question to show that section.</p>
          ) : null}
          {draft.faqs.map((faq, index) => (
            <div key={faq.id} className="grid gap-3 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Question {index + 1}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      faqs: draft.faqs.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
              <Label htmlFor={`faq-q-${faq.id}`}>Question</Label>
              <Input
                id={`faq-q-${faq.id}`}
                className="h-11 px-3"
                value={faq.question}
                onChange={(event) => updateFaq(index, "question", event.target.value)}
              />
              <Label htmlFor={`faq-a-${faq.id}`}>Answer</Label>
              <Textarea
                id={`faq-a-${faq.id}`}
                className="min-h-24"
                value={faq.answer}
                onChange={(event) => updateFaq(index, "answer", event.target.value)}
              />
            </div>
          ))}
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        <Button type="submit" className="h-11 w-fit px-4" disabled={pending}>
          {pending ? "Saving…" : "Save About page"}
        </Button>
      </form>
    </div>
  );
}
