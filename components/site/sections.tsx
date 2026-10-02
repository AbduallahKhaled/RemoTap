"use client";

/* Landing sections. The home page shows the short version; each one also has its own page (see info-page.tsx). */
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { NfcWaves } from "@/components/site/brand";
import { MiniCard, PhoneMock, StandVisual } from "@/components/site/product-visuals";
import { SectionHead } from "@/components/site/shop";
import { cn } from "@/lib/utils";

export function BigMarquee() {
  const { t } = useStore();
  const words = [t("big.1"), t("big.2"), t("big.3")];
  const row = (
    <div className="flex shrink-0 items-center" aria-hidden>
      {[...words, ...words].map((w, i) => (
        <span key={i} className="flex items-center gap-10 px-10">
          {/* dir="auto" keeps Arabic punctuation on the right side; padding stops the gradient text being clipped */}
          <span dir="auto" className={cn("whitespace-nowrap px-2 py-3 font-display text-5xl uppercase leading-[1.3] sm:text-7xl", i % 3 === 1 ? "text-outline" : i % 3 === 2 ? "text-grad" : "text-white")}>{w}</span>
          <NfcWaves className="size-10 text-brand-purple" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative flex overflow-hidden py-14 [--mq-dur:40s]" dir="ltr">
      <span className="sr-only">{words.join(" ")}</span>
      <div className="flex animate-marquee" dir="ltr">
        {row}
        {row}
      </div>
    </div>
  );
}

export function Audience() {
  const { t } = useStore();
  const blocks = [
    { key: "shop", product: "stand" as const, visual: <StandVisual className="h-72 w-full" design="google" /> },
    {
      key: "stu",
      product: "card" as const,
      visual: (
        <div className="relative grid h-72 place-items-center">
          <MiniCard design="mesh" className="absolute w-[58%] translate-x-[18%] -translate-y-[10%] rotate-[10deg]" />
          <MiniCard design="midnight" name="REMOTAP" className="relative w-[62%] -rotate-[6deg]" />
        </div>
      ),
    },
  ];
  return (
    <section id="for" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6">
      <SectionHead eyebrow={t("aud.eyebrow")} title={t("aud.title")} />
      <div className="grid gap-6 lg:grid-cols-2">
        {blocks.map((b, i) => (
          <div key={b.key} className="reveal rt-box group overflow-hidden rounded-[2rem] bg-gradient-to-b from-white/[0.05] to-transparent" style={{ transitionDelay: `${i * 90}ms` }}>
            <div className="relative border-b border-white/10 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(140,82,255,.25),transparent)]">{b.visual}</div>
            <div className="p-8">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">{t(`aud.${b.key}.tag`)}</span>
              <h3 className="mt-3 font-display text-xl uppercase leading-snug tracking-wide sm:text-2xl">{t(`aud.${b.key}.title`)}</h3>
              <p className="mt-3 text-white/60">{t(`aud.${b.key}.body`)}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
                    {t(`aud.${b.key}.t${n}`)}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8">
                <NavLink href={`/product/${b.product}?plan=plus`}>
                  {t(`aud.${b.key}.cta`)} <ArrowRight className="rtl:rotate-180" />
                </NavLink>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function How() {
  const { t } = useStore();
  return (
    <section id="how" className="relative scroll-mt-24 border-y border-white/10 bg-ink-2/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow={t("how.eyebrow")} title={t("how.title")} />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="reveal rt-box relative overflow-hidden rounded-3xl bg-ink p-8" style={{ transitionDelay: `${n * 80}ms` }}>
              <div className="pointer-events-none absolute -end-2 -top-6 font-display text-[9rem] leading-none text-white/[0.04]">0{n}</div>
              <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-blue font-display">{n}</div>
              <h3 className="mt-6 font-display text-lg uppercase tracking-wide">{t(`how.s${n}.t`)}</h3>
              <p className="mt-3 text-white/60">{t(`how.s${n}.b`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Compare() {
  const { t } = useStore();
  return (
    <section id="why" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-24 sm:px-6">
      <SectionHead eyebrow={t("cmp.eyebrow")} title={t("cmp.title")} center />
      <div className="reveal rt-box overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-white/[0.04] text-xs font-bold uppercase tracking-wider text-white/50 sm:text-sm">
          <div className="p-4 sm:p-5" />
          <div className="p-4 sm:p-5">{t("cmp.h2")}</div>
          <div className="p-4 text-brand-cyan sm:p-5">{t("cmp.h3")}</div>
        </div>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-white/10 text-sm sm:text-base">
            <div className="p-4 font-semibold sm:p-5">{t(`cmp.r${n}`)}</div>
            <div className="p-4 text-white/45 sm:p-5">{t(`cmp.r${n}a`)}</div>
            <div className="flex items-start gap-2 bg-brand-purple/[0.07] p-4 sm:p-5">
              <Check className="mt-1 size-4 shrink-0 text-brand-cyan" />
              {t(`cmp.r${n}b`)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Demo() {
  const { t } = useStore();
  return (
    <section id="demo" className="relative scroll-mt-24 overflow-hidden py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/15 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow={t("demo.eyebrow")} title={t("demo.title")} lead={t("demo.lead")} className="mb-10" />
          <div className="space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="reveal flex gap-4">
                <div className="rt-chip size-11">
                  <NfcWaves className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{t(`demo.p${n}.t`)}</h3>
                  <p className="mt-1 text-sm text-white/60">{t(`demo.p${n}.b`)}</p>
                </div>
              </div>
            ))}
          </div>
          <Button asChild size="lg" className="mt-10">
            <NavLink href="/p/demo">
              {t("demo.cta")} <ArrowRight className="rtl:rotate-180" />
            </NavLink>
          </Button>
        </div>
        <div className="reveal">
          <PhoneMock />
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useStore();
  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-24 sm:px-6">
      <SectionHead eyebrow={t("faq.eyebrow")} title={t("faq.title")} center />
      <Accordion type="single" collapsible className="reveal grid gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <AccordionItem key={n} value={`q${n}`} className="rt-box rounded-2xl border-b-0 bg-[#0b0b26] px-5">
            <AccordionTrigger>{t(`faq.q${n}`)}</AccordionTrigger>
            <AccordionContent>{t(`faq.a${n}`)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function CtaBand() {
  const { t, waLink } = useStore();
  return (
    <section className="px-4 pb-10 sm:px-6">
      <div className="reveal noise relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-purple via-[#5b5cff] to-brand-blue px-6 py-20 text-center sm:px-12">
        <div className="pointer-events-none absolute -end-20 -top-20 size-80 rounded-full border-[40px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -start-10 size-72 rounded-full border-[30px] border-white/10" />
        <h2 className="relative font-display text-3xl uppercase tracking-wide sm:text-6xl">{t("cta.title")}</h2>
        <p className="relative mx-auto mt-5 max-w-xl text-white/85 sm:text-lg">{t("cta.lead")}</p>
        <div className="relative mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="white">
            <NavLink href="/shop">
              <NfcWaves className="size-5" /> {t("hero.shop")}
            </NavLink>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10">
            <a href={waLink(t("o.chat.msg", { product: t("o.card"), plan: "Plus" }))} target="_blank" rel="noopener">
              <MessageCircle /> {t("cta.wa")}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

