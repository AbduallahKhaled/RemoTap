"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Smartphone, QrCode, Truck, RefreshCw } from "lucide-react";
import { useStore } from "@/components/providers";
import { price } from "@/lib/store";
import { NavLink } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import CardsShader from "@/components/ui/cards-shader-effect";
import { CARD_DESIGNS } from "@/components/ui/cards-shader-effect-utils/shaders-map";
import { NfcWaves } from "@/components/site/brand";
import { ProductGrid, SectionHead } from "@/components/site/shop";
import { CtaBand } from "@/components/site/sections";
import { Explore } from "@/components/site/info-page";
import { cn } from "@/lib/utils";

function useCoarse() {
  const [c, setC] = useState(false);
  // Browser-only values (storage, URL, pointer type) are read after hydration of the static page.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setC(matchMedia("(hover: none)").matches), []);
  return c;
}

function Hero() {
  const { t, config, money, cur, lang } = useStore();
  const [design, setDesign] = useState(0);
  const coarse = useCoarse();

  return (
    <section className="noise relative -mt-16 overflow-hidden pt-16">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-grid absolute inset-0" />
        <div className="absolute left-1/2 top-[38%] h-[60vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/30 blur-[120px]" />
        <div className="absolute bottom-0 right-[10%] h-[40vmin] w-[40vmin] rounded-full bg-brand-blue/25 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Words on one side, card on the other: nothing hides behind the card. */}
        <div className="relative grid items-center gap-4 pt-8 md:grid-cols-[1fr_1.15fr] md:gap-8 md:pt-14">
          <div className="text-center md:text-start">
            <h1 className="sr-only">
              {t("hero.title1")} {t("hero.title2")}
            </h1>
            <div
              aria-hidden
              className={cn(
                "flex flex-wrap justify-center gap-x-[0.28em] font-display uppercase md:block",
                // Arabic letters are taller (dots, descenders): more line height and no letter spacing so nothing is clipped
                lang === "ar" ? "px-[0.08em] leading-[1.35] tracking-normal" : "leading-[0.95] tracking-[0.02em]",
              )}
              style={{ fontSize: lang === "ar" ? "clamp(40px, 6.6vw, 104px)" : "clamp(38px, 7.4vw, 120px)" }}
            >
              <span className="block text-white">{t("hero.big1")}</span>
              <span className="text-outline block">{t("hero.big2")}</span>
              <span className="text-grad block px-[0.06em] py-[0.08em]">{t("hero.big3")}</span>
            </div>
            {/* chips sit under the words, never on top of the card */}
            <div className="mt-6 hidden flex-wrap gap-3 md:flex">
              <div className="rt-box rounded-2xl bg-ink/60 px-4 py-3 text-sm backdrop-blur-md">
                <div className="text-xs text-white/50">{t("shop.from")}</div>
                <div className="font-display text-xl">
                  {money(price(config, "card", "basic"))} <span className="text-xs text-white/60">{cur}</span>
                </div>
              </div>
              <div className="rt-box flex items-center gap-3 rounded-2xl bg-ink/60 px-4 py-3 text-sm backdrop-blur-md">
                <span className="rt-chip size-9">
                  <NfcWaves className="size-5" />
                </span>
                <span>{t("trust.1")}</span>
              </div>
            </div>
          </div>
          {/* the 3D card */}
          <div className="relative h-[clamp(230px,58vw,300px)] md:h-[min(52svh,480px)]">
            <CardsShader
              design={design}
              onDesignChange={setDesign}
              maxWidth={460}
              name="REMOTAP"
              title="Smart NFC cards & stands · Cairo"
              slug="demo"
              domain={config.domain || "remotap.com"}
            />
          </div>
        </div>

        {/* design picker */}
        <div className="relative mt-4 flex flex-col items-center gap-3 md:mt-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{coarse ? t("hero.hint.touch") : t("hero.hint.mouse")}</p>
          <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label={t("prod.design")}>
            {CARD_DESIGNS.map((d, i) => (
              <button
                key={d.id}
                role="radio"
                aria-checked={design === i}
                aria-label={d.name[lang]}
                title={d.name[lang]}
                onClick={() => setDesign(i)}
                className={cn(
                  "size-7 rounded-full border-2 transition-transform hover:scale-110 sm:size-8",
                  design === i ? "scale-110 border-white" : "border-white/15",
                )}
                style={{ background: d.css }}
              />
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-6 flex max-w-3xl flex-col items-center pb-14 text-center">
          <NavLink
            href="/product/instapay"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-purple/50 bg-brand-purple/15 py-1.5 pe-3 ps-1.5 text-sm font-semibold transition hover:bg-brand-purple/25"
          >
            <span className="rounded-full bg-brand-cyan px-2 py-0.5 text-[10px] font-bold uppercase text-ink">{t("tag.new")}</span>
            {t("hero.new")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </NavLink>
          <p className="text-base text-white/70 sm:text-lg">{t("hero.lead")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <NavLink href="/shop">
                <NfcWaves className="size-5" /> {t("hero.shop")}
              </NavLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <NavLink href="/p/demo">{t("hero.cta2")}</NavLink>
            </Button>
          </div>
          <p className="mt-5 text-sm text-white/45" dangerouslySetInnerHTML={{ __html: t("hero.note") }} />
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const { t } = useStore();
  const items = [
    [Smartphone, "trust.1"],
    [QrCode, "trust.2"],
    [Truck, "trust.3"],
    [RefreshCw, "trust.4"],
  ] as const;
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-6 sm:px-6 lg:grid-cols-4">
      {items.map(([Icon, k]) => (
        <div key={k} className="rt-box flex items-center gap-3 rounded-2xl bg-[#0b0b26] px-4 py-4 text-sm font-semibold text-white/85">
          <span className="rt-chip size-9">
            <Icon className="size-[18px]" />
          </span>
          {t(k)}
        </div>
      ))}
    </div>
  );
}

/** Short landing page: only what helps someone buy. Everything else has its own page (Explore). */
export default function HomeClient() {
  const { t } = useStore();
  return (
    <>
      <Hero />
      <TrustStrip />
      <section id="shop" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow={t("shop.eyebrow")} title={t("shop.title")} lead={t("shop.lead")} className="mb-12" />
          <Button asChild variant="outline" className="reveal mb-12">
            <NavLink href="/shop">
              {t("shop.page")} <ArrowRight className="rtl:rotate-180" />
            </NavLink>
          </Button>
        </div>
        <ProductGrid />
      </section>
      <Explore />
      <CtaBand />
    </>
  );
}
