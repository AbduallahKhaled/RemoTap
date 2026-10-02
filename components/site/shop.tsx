"use client";

import { useState } from "react";
import { Check, X, ArrowUpRight, Palette, ShoppingBag } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { MiniCard, MiniInstaPay, ProductThumb, StandPlate } from "@/components/site/product-visuals";
import { READY_STANDS } from "@/lib/stands";
import { NfcWaves } from "@/components/site/brand";
import { FEATURES, PRODUCTS, plansFor, price, type PlanKey, type ProductKey } from "@/lib/store";
import { cn } from "@/lib/utils";

const TILE_DESIGN: Record<PlanKey, string> = { plus: "aurora", basic: "midnight" };

/** Store tile: one per product, big visual, Basic/Plus switch, price, quick add. */
export function ProductTile({ product, plan: startPlan = "plus", index = 0 }: { product: ProductKey; plan?: PlanKey; index?: number }) {
  const { t, config, money, cur, addToCart, setCartOpen } = useStore();
  const plans = plansFor(config, product);
  const [want, setWant] = useState<PlanKey>(startPlan);
  const plan: PlanKey = plans.includes(want) ? want : (plans[0] ?? "basic");
  const href = `/product/${product}${plans.length > 1 ? `?plan=${plan}` : ""}`;
  const isNew = product === "instapay";
  return (
    <article className="reveal group relative flex flex-col" style={{ transitionDelay: `${index * 70}ms` }}>
      <NavLink href={href} className="block">
        <div className="rt-box relative aspect-[4/5] overflow-hidden rounded-3xl bg-gradient-to-br from-[#15153a] via-ink-2 to-ink">
          <div className="absolute inset-0 opacity-60 hero-grid" />
          <div className="absolute inset-0 grid place-items-center transition-transform duration-700 ease-out group-hover:scale-[1.06]">
            {product === "card" && (
              <div className="relative w-[74%]">
                <MiniCard design="nebula" className="absolute inset-0 w-full translate-x-[10%] -translate-y-[16%] rotate-[8deg] opacity-40 blur-[1px]" />
                <MiniCard design={TILE_DESIGN[plan]} name="REMOTAP" className="relative w-full -rotate-[8deg] transition-transform duration-700 group-hover:-rotate-[2deg]" />
              </div>
            )}
            {product === "stand" && <StandPlate design="remotap" className="w-[64%] rotate-[-4deg] shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] transition-transform duration-700 group-hover:rotate-0" />}
            {product === "instapay" && <MiniInstaPay className="h-[74%] rotate-[6deg] transition-transform duration-700 group-hover:rotate-0" />}
          </div>
          <div className="absolute start-3 top-3 flex flex-wrap gap-1.5 sm:start-4 sm:top-4 sm:gap-2">
            {isNew && <span className="rounded-full bg-brand-cyan px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink sm:px-3 sm:text-[11px]">{t("tag.new")}</span>}
            {product === "card" && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink sm:px-3 sm:text-[11px]">{t("tag.best")}</span>}
          </div>
          <span className="absolute end-3 top-3 hidden size-10 place-items-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur transition group-hover:bg-white group-hover:text-ink sm:end-4 sm:top-4 sm:grid rtl:-scale-x-100">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </NavLink>
      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="font-display text-[13px] uppercase tracking-wide sm:text-[15px]">
            <NavLink href={href}>{t(`prod.${product}`)}</NavLink>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-white/55">{t(`price.${plan}.sub.${product}`)}</p>
        </div>
        <div className="shrink-0 text-end text-lg font-extrabold">
          {money(price(config, product, plan))} <span className="text-xs font-semibold text-white/60">{cur}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 px-1">
        {plans.length > 1 ? (
          <div className="inline-flex rounded-full border border-white/15 p-0.5 text-xs font-bold" role="radiogroup" aria-label={t("prod.plan")}>
            {plans.map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={plan === p}
                onClick={() => setWant(p)}
                className={cn("rounded-full px-3.5 py-1.5 transition", plan === p ? "bg-white text-ink" : "text-white/65 hover:text-white")}
              >
                {p === "plus" ? "Plus" : "Basic"}
              </button>
            ))}
          </div>
        ) : (
          <span className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-bold text-white/65">{t("tag.one")}</span>
        )}
        <Button
          size="sm"
          className="ms-auto"
          onClick={() => {
            addToCart({ product, plan, qty: 1, design: product === "card" ? TILE_DESIGN[plan] : product === "stand" ? "remotap" : undefined });
            setCartOpen(true);
          }}
        >
          <ShoppingBag /> {t("cart.add")}
        </Button>
      </div>
    </article>
  );
}

/** The ready stand designs (Google, Instagram, InstaPay…), each its own product at the Basic stand price. */
export function StandRange() {
  const { t, lang, config, money, cur, addToCart, setCartOpen } = useStore();
  if (!plansFor(config, "stand").includes("basic")) return null;
  const each = price(config, "stand", "basic");
  return (
    <div id="stands" className="scroll-mt-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-brand-cyan">
            <span className="h-px w-8 bg-brand-cyan" /> {t("st.eyebrow")}
          </div>
          <h2 className="font-display text-2xl uppercase tracking-wide sm:text-4xl">{t("st.title")}</h2>
          <p className="mt-3 text-white/60">{t("st.lead", { price: money(each) })}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-purple/50 bg-brand-purple/15 px-4 py-2 text-sm font-semibold">
          <Palette className="size-4 text-brand-cyan" /> {t("tag.custom")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
        {READY_STANDS.map((st, i) => {
          const href = `/product/stand?plan=basic&style=${st.id}`;
          return (
            <article key={st.id} className="reveal group flex flex-col" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
              <NavLink href={href} className="block">
                <div className="rt-box relative grid aspect-square place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#15153a] via-ink-2 to-ink">
                  <div className="absolute inset-0 opacity-60 hero-grid" />
                  <StandPlate design={st.id} className="w-[68%] -rotate-3 shadow-[0_24px_50px_-18px_rgba(0,0,0,.9)] transition-transform duration-700 group-hover:rotate-0 group-hover:scale-105" />
                  <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">{t("tag.custom.short")}</span>
                </div>
              </NavLink>
              <div className="mt-4 flex items-start justify-between gap-2 px-1">
                <h3 className="font-display text-[12px] uppercase leading-snug tracking-wide sm:text-[14px]">
                  <NavLink href={href}>{st.name[lang]}</NavLink>
                </h3>
                <div className="shrink-0 font-extrabold sm:text-lg">
                  {money(each)} <span className="text-[10px] font-semibold text-white/60 sm:text-xs">{cur}</span>
                </div>
              </div>
              <p className="mt-1.5 line-clamp-3 px-1 text-xs text-white/55 sm:text-sm">{st.desc[lang]}</p>
              <Button
                size="sm"
                variant="outline"
                className="mx-1 mt-4 self-start"
                onClick={() => {
                  addToCart({ product: "stand", plan: "basic", qty: 1, design: st.id });
                  setCartOpen(true);
                }}
              >
                <ShoppingBag /> {t("cart.add")}
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function ProductGrid() {
  const { config } = useStore();
  const list = PRODUCTS.filter((p) => plansFor(config, p).length > 0);
  return (
    <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p, i) => (
        <ProductTile key={p} product={p} index={i} />
      ))}
    </div>
  );
}

/** "What do you need it for?" helper: three answers, one recommended product. */
export function Chooser() {
  const { t, config, money, cur, addToCart, setCartOpen } = useStore();
  const opts = [
    { k: "shop", product: "instapay" as ProductKey, plan: "basic" as PlanKey, why: "pick.why.instapay" },
    { k: "review", product: "stand" as ProductKey, plan: "plus" as PlanKey, why: "pick.why.stand" },
    { k: "me", product: "card" as ProductKey, plan: "plus" as PlanKey, why: "pick.why.card" },
  ].filter((o) => plansFor(config, o.product).includes(o.plan));
  const [sel, setSel] = useState(0);
  const o = opts[sel] ?? opts[0];
  if (!o) return null;
  return (
    <div className="reveal rt-box grid gap-6 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent p-5 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-brand-cyan">{t("pick.eyebrow")}</div>
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{t("pick.title")}</h2>
        <p className="mt-2 text-white/55">{t("pick.lead")}</p>
        <div className="mt-6 grid gap-2.5" role="radiogroup" aria-label={t("pick.title")}>
          {opts.map((x, i) => (
            <button
              key={x.k}
              role="radio"
              aria-checked={sel === i}
              onClick={() => setSel(i)}
              className={cn(
                "flex items-center gap-4 rounded-2xl border px-4 py-3.5 text-start transition",
                sel === i ? "rt-box bg-brand-purple/15" : "rt-box opacity-80 hover:opacity-100",
              )}
            >
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", sel === i ? "border-brand-cyan" : "border-white/30")}>
                {sel === i && <span className="size-2.5 rounded-full bg-brand-cyan" />}
              </span>
              <span>
                <span className="block font-semibold">{t(`pick.${x.k}`)}</span>
                <span className="block text-xs text-white/50">{t(`pick.${x.k}.d`)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="rt-box flex flex-col gap-5 rounded-3xl bg-ink-2 p-5 sm:flex-row sm:items-center">
        <ProductThumb product={o.product} design="aurora" className="aspect-square w-full shrink-0 rounded-2xl sm:w-40" />
        <div className="min-w-0">
          <div className="font-display text-lg uppercase tracking-wide">
            {t(`prod.${o.product}`)} {plansFor(config, o.product).length > 1 && <span className="text-grad">{o.plan === "plus" ? "Plus" : "Basic"}</span>}
          </div>
          <p className="mt-2 text-sm text-white/60">{t(o.why)}</p>
          <div className="mt-3 font-display text-2xl">
            {money(price(config, o.product, o.plan))} <span className="text-xs text-white/55">{cur}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                addToCart({ product: o.product, plan: o.plan, qty: 1, design: o.product === "card" ? "aurora" : undefined });
                setCartOpen(true);
              }}
            >
              <ShoppingBag /> {t("cart.add")}
            </Button>
            <Button asChild size="sm" variant="outline">
              <NavLink href={`/product/${o.product}${o.product === "instapay" ? "" : `?plan=${o.plan}`}`}>{t("pick.see")}</NavLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Basic vs Plus comparison with a card/stand switch (the old pricing section). */
export function Pricing() {
  const { t, config, money, cur, addToCart, setCartOpen } = useStore();
  const sold = PRODUCTS.filter((p) => plansFor(config, p).length > 0);
  const [want, setProduct] = useState<ProductKey>("card");
  const product = sold.includes(want) ? want : (sold[0] ?? "card");
  const plans = plansFor(config, product);
  const single = plans.length === 1;
  // .reveal sits on a wrapper whose class never changes: React would drop the added "in" class on re-render.
  return (
    <div className="reveal">
      <div className="mb-10 flex justify-center">
        <div className="rt-box inline-flex max-w-full overflow-x-auto rounded-full bg-white/[0.03] p-1" role="tablist">
          {sold.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={product === p}
              onClick={() => setProduct(p)}
              className={cn("whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition sm:px-6", product === p ? "bg-white text-ink" : "text-white/70 hover:text-white")}
            >
              {t(`price.tab.${p}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("mx-auto grid gap-6", single ? "max-w-md" : "max-w-4xl md:grid-cols-2")}>
        {plans.map((plan) => {
          const hi = plan === "plus" || single;
          return (
            <div
              key={plan}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8",
                hi ? "border-transparent bg-[linear-gradient(var(--ink-2),var(--ink-2))_padding-box,var(--grad)_border-box] shadow-[0_40px_100px_-40px_rgba(140,82,255,.7)]" : "rt-box bg-white/[0.02]",
              )}
            >
              {hi && (
                <span className="absolute -top-3 start-8 rounded-full bg-gradient-to-r from-brand-purple to-brand-blue px-3 py-1 text-xs font-bold">
                  {single ? t("tag.new") : t("price.badge")}
                </span>
              )}
              <div className="font-display text-lg uppercase tracking-wide">{single ? t(`prod.${product}`) : t(`price.${plan}`)}</div>
              <p className="mt-2 min-h-12 text-sm text-white/60">{t(`price.${plan}.sub.${product}`)}</p>
              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-5xl">{money(price(config, product, plan))}</span>
                <span className="pb-1.5 text-sm font-semibold text-white/60">{cur}</span>
              </div>
              <p className="mt-2 text-xs text-white/45">{single ? t("tag.one") : t(`price.note.${plan}`)}</p>
              <ul className="my-8 space-y-3 text-sm">
                {FEATURES[product][plan].map(([k, on]) => (
                  <li key={k} className={cn("flex items-start gap-3", !on && "text-white/35 line-through decoration-white/20")}>
                    {on ? <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" /> : <X className="mt-0.5 size-4 shrink-0" />}
                    {t(k)}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3">
                <Button
                  variant={hi ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    addToCart({ product, plan, qty: 1, design: product === "card" ? "midnight" : undefined });
                    setCartOpen(true);
                  }}
                >
                  <NfcWaves className="size-4" /> {t("cart.add")}
                </Button>
                <Button asChild variant="ghost">
                  <NavLink href={single ? `/product/${product}` : `/product/${product}?plan=${plan}`}>{t("shop.view")}</NavLink>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SectionHead({ eyebrow, title, lead, className, center = false }: { eyebrow: string; title: React.ReactNode; lead?: string; className?: string; center?: boolean }) {
  return (
    <div className={cn("reveal mb-12 max-w-3xl", center && "mx-auto text-center", className)}>
      <div className={cn("mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-brand-cyan", center && "justify-center")}>
        <span className="h-px w-8 bg-brand-cyan" />
        {eyebrow}
      </div>
      <h2 className="font-display text-3xl uppercase leading-[1.08] tracking-wide sm:text-5xl">{title}</h2>
      {lead && <p className="mt-5 text-base text-white/60 sm:text-lg">{lead}</p>}
    </div>
  );
}
