"use client";

import { useStore } from "@/components/providers";
import { Marquee } from "@/components/site/chrome";
import { Chooser, Pricing, ProductGrid, StandRange } from "@/components/site/shop";

export default function ShopClient() {
  const { t } = useStore();
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[70vw] -translate-x-1/2 rounded-full bg-brand-purple/25 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-brand-cyan">{t("shop.eyebrow")}</div>
          <h1 className="font-display text-[clamp(44px,10vw,140px)] uppercase leading-[0.9] tracking-wide">
            {t("nav.shop")}
            <span className="text-grad">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-white/60 sm:text-lg">{t("shop.lead")}</p>
        </div>
        <div className="border-t border-white/10 py-3 text-sm font-semibold text-white/60">
          <Marquee />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <ProductGrid />
        <div className="mt-24">
          <StandRange />
        </div>
        <div className="mt-16">
          <Chooser />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Pricing />
      </section>
    </>
  );
}
