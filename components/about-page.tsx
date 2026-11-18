import Link from "next/link";
import { PageIntro, Shell } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import type { AboutBlock, AboutPageContent, FaqItem } from "@/lib/about-content";

function Section({ block }: { block: AboutBlock }) {
  return (
    <section id={block.id} className="border-t border-border pt-10">
      {block.eyebrow ? (
        <p className="text-xs tracking-[0.16em] text-primary uppercase">{block.eyebrow}</p>
      ) : null}
      <h2 className="mt-2 font-display text-3xl text-balance sm:text-4xl">{block.title}</h2>
      <div className="mt-4 max-w-3xl space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
        {block.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
        {block.closing ? <p className="font-medium text-foreground">{block.closing}</p> : null}
      </div>
    </section>
  );
}

function FaqList({ faqs }: { faqs: FaqItem[] }) {
  return (
    <section id="faq" className="border-t border-border pt-10">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">FAQ</p>
      <h2 className="mt-2 font-display text-3xl sm:text-4xl">Questions we hear often</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        Kitchen staff will be able to edit these answers from the admin portal soon. For now, here is what most customers ask.
      </p>
      <dl className="mt-8 grid gap-6">
        {faqs.map((item) => (
          <div key={item.id} className="border-t border-border pt-4">
            <dt className="font-display text-2xl">{item.question}</dt>
            <dd className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AboutPageView({ content }: { content: AboutPageContent }) {
  return (
    <Shell>
      <PageIntro eyebrow={content.hero.eyebrow} title={content.hero.title} lede={content.hero.lede} />

      <div className="mt-10 grid gap-12">
        <Section block={content.intro} />
        <Section block={content.cooks} />
        <Section block={content.philosophy} />
        <Section block={content.mealPrep} />
        <Section block={content.catering} />
        <Section block={content.mission} />

        <p className="max-w-3xl font-display text-2xl leading-snug text-balance sm:text-3xl">{content.tagline}</p>

        <div className="flex flex-wrap gap-3">
          <Button className="h-11 px-4" render={<Link href="/order?kind=weekly" />}>
            Plan weekly meals
          </Button>
          <Button variant="outline" className="h-11 bg-card px-4" render={<Link href="/order?kind=catering" />}>
            Cater a gathering
          </Button>
          <Button variant="outline" className="h-11 bg-card px-4" render={<Link href="/menu" />}>
            View packages
          </Button>
        </div>

        <FaqList faqs={content.faqs} />
      </div>
    </Shell>
  );
}
