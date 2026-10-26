"use client";

import type { ReactNode } from "react";
import { Briefcase, CircleHelp, ListOrdered, Smartphone, Sparkles, Tag, Users } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink } from "@/lib/nav";
import { Pricing, SectionHead } from "@/components/site/shop";
import { Services } from "@/components/site/services";
import { Audience, BigMarquee, Compare, CtaBand, Demo, Faq, How } from "@/components/site/sections";

/** Detail pages: everything that is not on the short home page. Each has its own URL (/stands, /how, ...). */
export const INFO_PAGES = [
  { key: "how", title: "nav.how", icon: ListOrdered },
  { key: "pricing", title: "nav.pricing", icon: Tag },
  { key: "demo", title: "nav.demo", icon: Smartphone },
  { key: "for", title: "aud.eyebrow", icon: Users },
  { key: "why", title: "cmp.eyebrow", icon: Sparkles },
  { key: "faq", title: "nav.faq", icon: CircleHelp },
  { key: "services", title: "nav.services", icon: Briefcase },
] as const;

export type InfoKey = (typeof INFO_PAGES)[number]["key"];
export const INFO_KEYS = INFO_PAGES.map((p) => p.key) as readonly string[];

function Content({ page }: { page: InfoKey }): ReactNode {
  const { t } = useStore();
  switch (page) {
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
    case "services":
      return <Services />;
  }
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
      <CtaBand />
    </>
  );
}
