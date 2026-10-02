"use client";

import type { ReactNode } from "react";
import { ArrowRight, CircleHelp, ListOrdered, ShoppingBag, Smartphone, Sparkles, Store, Tag, Users } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink } from "@/lib/nav";
import { Chooser, Pricing, SectionHead, StandRange } from "@/components/site/shop";
import { Audience, BigMarquee, Compare, CtaBand, Demo, Faq, How } from "@/components/site/sections";

/** Detail pages: everything that is not on the short home page. Each has its own URL (/stands, /how, ...). */
export const INFO_PAGES = [
  { key: "stands", title: "st.eyebrow", icon: Store },
  { key: "how", title: "nav.how", icon: ListOrdered },
  { key: "pricing", title: "nav.pricing", icon: Tag },
  { key: "demo", title: "nav.demo", icon: Smartphone },
  { key: "for", title: "aud.eyebrow", icon: Users },
  { key: "why", title: "cmp.eyebrow", icon: Sparkles },
  { key: "faq", title: "nav.faq", icon: CircleHelp },
] as const;

export type InfoKey = (typeof INFO_PAGES)[number]["key"];
export const INFO_KEYS = INFO_PAGES.map((p) => p.key) as readonly string[];

function Content({ page }: { page: InfoKey }): ReactNode {
  const { t } = useStore();
  switch (page) {
    case "stands":
      return (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <StandRange />
          <div className="mt-16">
            <Chooser />
          </div>
        </section>
      );
    case "pricing":
      return (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHead eyebrow={t("price.eyebrow")} title={t("price.title")} lead={t("price.lead")} center />
          <Pricing />
        </section>
      );
    case "how":
      return <How />;
    case "for":
      return <Audience />;
    case "why":
      return (
        <>
          <Compare />
          <BigMarquee />
        </>
      );
    case "demo":
      return <Demo />;
    case "faq":
      return <Faq />;
  }
}

/** Grid of cards that open the detail pages. */
export function Explore({ exclude, title }: { exclude?: InfoKey; title?: boolean }) {
  const { t } = useStore();
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      {title !== false && <SectionHead eyebrow={t("more.eyebrow")} title={t("more.title")} lead={t("more.lead")} />}
      <div className={`grid gap-4 sm:grid-cols-2 ${exclude ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {INFO_PAGES.filter((p) => p.key !== exclude).map((p, i) => (
          <NavLink
            key={p.key}
            href={`/${p.key}`}
            className="reveal rt-box group flex flex-col rounded-3xl bg-[#0b0b26] p-6 transition-transform hover:-translate-y-1"
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <span className="rt-chip size-11">
              <p.icon className="size-5" />
            </span>
            <h3 className="mt-5 font-display text-base uppercase tracking-wide">{t(p.title)}</h3>
            <p className="mt-2 flex-1 text-sm text-white/60">{t(`more.${p.key}`)}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan">
              {t("more.open")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </span>
          </NavLink>
        ))}
        {!exclude && (
          <NavLink href="/shop" className="reveal group flex flex-col rounded-3xl bg-gradient-to-br from-brand-purple to-brand-blue p-6 transition-transform hover:-translate-y-1">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
              <ShoppingBag className="size-5" />
            </span>
            <h3 className="mt-5 font-display text-base uppercase tracking-wide">{t("shop.page")}</h3>
            <p className="mt-2 flex-1 text-sm text-white/85">{t("more.shop")}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              {t("hero.shop")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </span>
          </NavLink>
        )}
      </div>
    </section>
  );
}

export default function InfoPage({ page }: { page: InfoKey }) {
  const { t } = useStore();
  const meta = INFO_PAGES.find((p) => p.key === page)!;
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-white/50">
          <NavLink href="/" className="hover:text-white">
            {t("more.home")}
          </NavLink>
          <span aria-hidden>/</span>
          <span className="text-white/80">{t(meta.title)}</span>
        </nav>
        <h1 className="sr-only">{t(meta.title)}</h1>
      </div>
      <Content page={page} />
      <div className="border-t border-white/10">
        <Explore exclude={page} />
      </div>
      <CtaBand />
    </>
  );
}
