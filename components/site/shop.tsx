"use client";

import { useEffect, useState } from "react";
import { Check, X, ArrowUpRight, Palette, ShoppingBag } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink, useNav } from "@/lib/nav";
import { scanReveal } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { CardPhoto, CoasterPlate, StandPlate, TapCardPhoto } from "@/components/site/product-visuals";
import { READY_STANDS, standStyle } from "@/lib/stands";
import { NfcWaves } from "@/components/site/brand";
import { FEATURES, PRODUCTS, isSized, planLabel, plansFor, price, type PlanKey, type ProductKey, type RailItem } from "@/lib/store";
import { cn } from "@/lib/utils";

const TILE_DESIGN: Record<PlanKey, string> = { plus: "pvc", basic: "pvc" };

/** Store tile: one per product, big visual, Basic/Plus switch, price, quick add. */
export function ProductTile({ product, plan: startPlan = "plus", index = 0, compact = false }: { product: ProductKey; plan?: PlanKey; index?: number; compact?: boolean }) {
  const { t, config, money, cur, addToCart, setCartOpen } = useStore();
  const plans = plansFor(config, product);
  const [want, setWant] = useState<PlanKey>(startPlan);
  const plan: PlanKey = plans.includes(want) ? want : (plans[0] ?? "basic");
  const href = `/product/${product}${plans.length > 1 ? `?plan=${plan}` : ""}`;
  const isNew = product === "instapay" || product === "vfcash" || product === "coaster";
  return (
    <article className="reveal group relative flex flex-col" style={{ transitionDelay: `${index * 70}ms` }}>
      <NavLink href={href} className="block">
        <div className={cn("rt-box relative overflow-hidden bg-gradient-to-br from-[#15153a] via-ink-2 to-ink", compact ? "aspect-square rounded-2xl" : "aspect-[4/5] rounded-3xl")}>
          <div className="absolute inset-0 opacity-60 hero-grid" />
          <div className="absolute inset-0 grid place-items-center transition-transform duration-700 ease-out group-hover:scale-[1.06]">
            {product === "card" && <CardPhoto type="pvc" className="w-[74%] rotate-[-4deg] shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] transition-transform duration-700 group-hover:rotate-0" />}
            {product === "stand" && <StandPlate design="remotap" className="w-[86%] rotate-[-3deg] shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] transition-transform duration-700 group-hover:rotate-0" />}
            {product === "coaster" && <CoasterPlate className="w-[86%] rotate-[-3deg] shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] transition-transform duration-700 group-hover:rotate-0" />}
            {(product === "instapay" || product === "vfcash") && <TapCardPhoto product={product} className="h-[72%] w-auto rotate-[5deg] transition-transform duration-700 group-hover:rotate-0" />}
          </div>
          <div className="absolute start-3 top-3 flex flex-wrap gap-1.5 sm:start-4 sm:top-4 sm:gap-2">
            {isNew && <span className="rounded-full bg-brand-cyan px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink sm:px-3 sm:text-[11px]">{t("tag.new")}</span>}
            {product === "card" && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink sm:px-3 sm:text-[11px]">{t("tag.best")}</span>}
          </div>
          {!compact && (
            <span className="absolute end-3 top-3 hidden size-10 place-items-center rounded-full border border-white/20 bg-black/30 text-white/80 backdrop-blur transition group-hover:bg-white group-hover:text-ink sm:end-4 sm:top-4 sm:grid rtl:-scale-x-100">
              <ArrowUpRight className="size-4" />
            </span>
          )}
        </div>
      </NavLink>
      <div className={cn("flex justify-between px-1", compact ? "mt-3 flex-col gap-1" : "mt-4 items-start gap-3")}>
        <div className="min-w-0">
          <h3 className={cn("font-display uppercase tracking-wide", compact ? "text-[11px] leading-snug sm:text-[12px]" : "text-[13px] sm:text-[15px]")}>
            <NavLink href={href}>{t(`prod.${product}`)}</NavLink>
          </h3>
          <p className={cn("mt-1 text-white/55", compact ? "line-clamp-1 text-xs" : "line-clamp-2 text-sm")}>{t(`price.${plan}.sub.${product}`)}</p>
        </div>
        <div className={cn("shrink-0 font-extrabold", compact ? "text-base" : "text-end text-lg")}>
          {money(price(config, product, plan))} <span className="text-xs font-semibold text-white/60">{cur}</span>
        </div>
      </div>
      <div className={cn("flex gap-2 px-1", compact ? "mt-3 flex-col items-stretch" : "mt-4 items-center")}>
        {plans.length > 1 ? (
          <div className={cn("inline-flex rounded-full border border-white/15 p-0.5 text-xs font-bold", compact && "self-start")} role="radiogroup" aria-label={t("prod.plan")}>
            {plans.map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={plan === p}
                onClick={() => setWant(p)}
                className={cn("rounded-full transition", compact ? "px-2.5 py-1" : "px-3.5 py-1.5", plan === p ? "bg-white text-ink" : "text-white/65 hover:text-white")}
              >
                {planLabel(product, p)}
              </button>
            ))}
          </div>
        ) : (
          <span className={cn("rounded-full border border-white/15 text-xs font-bold text-white/65", compact ? "self-start px-2.5 py-1" : "px-3.5 py-1.5")}>{t("tag.one")}</span>
        )}
        <Button
          size="sm"
          className={compact ? "w-full" : "ms-auto"}
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

/** Product photo sized for a square rail tile. */
function RailVisual({ item }: { item: RailItem }) {
  const fx = "shadow-[0_24px_50px_-18px_rgba(0,0,0,.9)] transition-transform duration-700 group-hover:scale-[1.04]";
  if (item.product === "card") return <CardPhoto type={item.design} className={cn("w-[84%] -rotate-3", fx)} />;
  if (item.product === "coaster") return <CoasterPlate className={cn("w-[80%]", fx)} />;
  if (item.product === "stand") return <StandPlate design={item.design ?? "remotap"} className={cn("w-[80%]", fx)} />;
  return <TapCardPhoto product={item.product} className={cn("h-[82%] w-auto rotate-3", fx)} />;
}

/**
 * Home page rail (new arrivals, best sellers): compact tiles, side-scrolling on phones, 4 columns from tablets up.
 * The lists live in site-config.json `home`, so the owner can change them without a rebuild.
 */
export function ProductRail({ id, title, items }: { id: string; title: string; items?: RailItem[] }) {
  const { t, lang, config, money, cur, addToCart, setCartOpen } = useStore();
  const list = (items ?? []).filter((i) => plansFor(config, i.product).length > 0);
  if (!list.length) return null;
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 sm:px-6">
      <SectionHead title={title} className="mb-8" />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {list.map((it) => {
          const plans = plansFor(config, it.product);
          const plan: PlanKey = it.plan && plans.includes(it.plan) ? it.plan : plans[0];
          const design = it.product === "stand" ? (it.design ?? "remotap") : undefined;
          const name = design && design !== "remotap" ? standStyle(design).name[lang] : t(`prod.${it.product}`);
          const q = new URLSearchParams();
          if (plans.length > 1) q.set("plan", plan);
          if (design) q.set("style", design);
          const href = `/product/${it.product}${q.size ? `?${q}` : ""}`;
          return (
            <li key={`${it.product}-${plan}-${design ?? ""}`} className="group flex w-[70%] shrink-0 snap-start flex-col sm:w-auto">
              <NavLink href={href} className="block">
                <div className="rt-box relative grid aspect-square place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#15153a] via-ink-2 to-ink">
                  <RailVisual item={{ ...it, design }} />
                </div>
              </NavLink>
              <div className="mt-3 flex items-start justify-between gap-2 px-1">
                <h3 className="min-w-0 font-display text-[12px] uppercase leading-snug tracking-wide sm:text-[13px]">
                  <NavLink href={href}>{name}</NavLink>
                </h3>
                <div className="shrink-0 font-extrabold">
                  {money(price(config, it.product, plan))} <span className="text-[10px] font-semibold text-white/60">{cur}</span>
                </div>
              </div>
              {plans.length > 1 && <p className="mt-0.5 px-1 text-xs text-white/55"><span dir="ltr">{planLabel(it.product, plan)}</span></p>}
              <Button
                size="sm"
                variant="outline"
                className="mx-1 mt-3 self-start"
                onClick={() => {
                  addToCart({ product: it.product, plan, qty: 1, design: it.product === "card" ? TILE_DESIGN[plan] : design });
                  setCartOpen(true);
                }}
              >
                <ShoppingBag /> {t("cart.add")}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type ShopFilter = "all" | "cards" | "stands" | "payment";
const SHOP_FILTERS: { k: ShopFilter; products: ProductKey[] }[] = [
  { k: "all", products: PRODUCTS },
  { k: "cards", products: ["card"] },
  { k: "stands", products: ["stand", "coaster"] },
  { k: "payment", products: ["instapay", "vfcash"] },
];

/** The whole store on one page: filter chips, product tiles, and the ready stand coaster designs. ?type= picks the filter. */
export function ShopCatalog({ initial = "all" }: { initial?: ShopFilter }) {
  const { t, config } = useStore();
  const nav = useNav();
  const fromUrl = nav.params.get("type");
  const [filter, setFilter] = useState<ShopFilter>(initial);
  useEffect(() => {
    // The static page is built without the query string, so the filter from the URL is applied after load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (SHOP_FILTERS.some((f) => f.k === fromUrl)) setFilter(fromUrl as ShopFilter);
  }, [fromUrl]);
  // Tiles mounted by a filter change need the reveal observer too, or they stay invisible.
  useEffect(() => scanReveal(), [filter]);
  const current = SHOP_FILTERS.find((f) => f.k === filter) ?? SHOP_FILTERS[0];
  const list = current.products.filter((p) => plansFor(config, p).length > 0);
  return (
    <>
      <div className="mb-10 flex flex-wrap gap-2" role="radiogroup" aria-label={t("filter.label")}>
        {SHOP_FILTERS.map((f) => (
          <button
            key={f.k}
            type="button"
            role="radio"
            aria-checked={filter === f.k}
            onClick={() => {
              setFilter(f.k);
              nav.replace(f.k === "all" ? "/shop" : `/shop?type=${f.k}`);
            }}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition",
              filter === f.k ? "border-white bg-white text-ink" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white",
            )}
          >
            {t(`filter.${f.k}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p, i) => (
          <ProductTile key={p} product={p} index={i} />
        ))}
      </div>
      {(filter === "all" || filter === "stands") && (
        <div className="mt-24">
          <StandRange />
        </div>
      )}
    </>
  );
}

export function ProductGrid() {
  const { config } = useStore();
  const list = PRODUCTS.filter((p) => plansFor(config, p).length > 0);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-5">
      {list.map((p, i) => (
        <ProductTile key={p} product={p} index={i} compact />
      ))}
    </div>
  );
}

/** "What do you need it for?" helper: three answers, one recommended product. */
export function Chooser() {
  const { t, lang, config, money, cur, addToCart, setCartOpen } = useStore();
  // Each answer carries the exact product look it recommends, so the picture matches the answer.
  const opts: { k: string; product: ProductKey; plan: PlanKey; design?: string; why: string }[] = [
    { k: "shop", product: "instapay", plan: "basic", why: "pick.why.instapay" },
    { k: "review", product: "stand", plan: "plus", design: "google", why: "pick.why.stand" },
    { k: "me", product: "card", plan: "plus", why: "pick.why.card" },
  ];
  const sold = opts.filter((o) => plansFor(config, o.product).includes(o.plan));
  const [sel, setSel] = useState(0);
  const o = sold[sel] ?? sold[0];
  if (!o) return null;
  const name = o.design ? standStyle(o.design).name[lang] : t(`prod.${o.product}`);
  const q = new URLSearchParams();
  if (plansFor(config, o.product).length > 1) q.set("plan", o.plan);
  if (o.design) q.set("style", o.design);
  return (
    <div className="reveal rt-box grid gap-6 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent p-5 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div>
        <h2 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{t("pick.title")}</h2>
        <p className="mt-2 text-white/55">{t("pick.lead")}</p>
        <div className="mt-6 grid gap-2.5" role="radiogroup" aria-label={t("pick.title")}>
          {sold.map((x, i) => (
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
        <div key={o.k} className="grid aspect-square w-full shrink-0 animate-[rt-fade_.35s_ease-out] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#16163a] to-ink-2 motion-reduce:animate-none sm:w-44">
          <RailVisual item={{ product: o.product, plan: o.plan, design: o.design }} />
        </div>
        <div className="min-w-0">
          <div className="font-display text-lg uppercase tracking-wide">
            {name}{" "}
            {plansFor(config, o.product).length > 1 && (
              <span className="text-grad" dir="ltr">
                {planLabel(o.product, o.plan)}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-white/60">{t(o.why)}</p>
          <div className="mt-3 font-display text-2xl">
            {money(price(config, o.product, o.plan))} <span className="text-xs text-white/55">{cur}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                addToCart({ product: o.product, plan: o.plan, qty: 1, design: o.product === "card" ? "holo" : o.design });
                setCartOpen(true);
              }}
            >
              <ShoppingBag /> {t("cart.add")}
            </Button>
            <Button asChild size="sm" variant="outline">
              <NavLink href={`/product/${o.product}${q.size ? `?${q}` : ""}`}>{t("pick.see")}</NavLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Basic vs Plus comparison with a card/stand switch (the old pricing section). */
/** Price tabs. The two payment cards share one tab: they are the same product for a different wallet. */
const PRICE_GROUPS: { k: string; products: ProductKey[] }[] = [
  { k: "card", products: ["card"] },
  { k: "stand", products: ["stand"] },
  { k: "coaster", products: ["coaster"] },
  { k: "payment", products: ["instapay", "vfcash"] },
];

/** Price comparison: one column per plan or size, or one per product in the payment cards tab. */
export function Pricing() {
  const { t, config, money, cur, addToCart, setCartOpen } = useStore();
  const groups = PRICE_GROUPS.map((g) => ({ ...g, products: g.products.filter((p) => plansFor(config, p).length > 0) })).filter((g) => g.products.length > 0);
  const [want, setGroup] = useState("card");
  const group = groups.find((g) => g.k === want) ?? groups[0];
  if (!group) return null;
  // One product: a column per plan/size. Several products (payment cards): a column per product.
  const columns =
    group.products.length === 1
      ? plansFor(config, group.products[0]).map((plan) => ({ product: group.products[0], plan }))
      : group.products.map((product) => ({ product, plan: plansFor(config, product)[0] }));
  const multi = group.products.length > 1;
  // .reveal sits on a wrapper whose class never changes: React would drop the added "in" class on re-render.
  return (
    <div className="reveal">
      <div className="mb-10 flex justify-center">
        <div className="rt-box inline-flex max-w-full overflow-x-auto rounded-full bg-white/[0.03] p-1" role="tablist">
          {groups.map((g) => (
            <button
              key={g.k}
              role="tab"
              aria-selected={group.k === g.k}
              onClick={() => setGroup(g.k)}
              className={cn("whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition sm:px-6", group.k === g.k ? "bg-white text-ink" : "text-white/70 hover:text-white")}
            >
              {t(`price.tab.${g.k}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("mx-auto grid gap-6", columns.length === 1 ? "max-w-md" : "max-w-4xl md:grid-cols-2")}>
        {columns.map(({ product, plan }) => {
          const onePlan = plansFor(config, product).length === 1;
          const hi = !multi && (plan === "plus" || onePlan);
          return (
            <div
              key={`${product}-${plan}`}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8",
                hi ? "border-transparent bg-[linear-gradient(var(--ink-2),var(--ink-2))_padding-box,var(--grad)_border-box] shadow-[0_40px_100px_-40px_rgba(140,82,255,.7)]" : "rt-box bg-white/[0.02]",
              )}
            >
              {hi && !onePlan && (
                <span className="absolute -top-3 start-8 rounded-full bg-gradient-to-r from-brand-purple to-brand-blue px-3 py-1 text-xs font-bold">{t("price.badge")}</span>
              )}
              <div className="font-display text-lg uppercase tracking-wide" dir={isSized(product) ? "ltr" : undefined}>
                {onePlan ? t(`prod.${product}`) : isSized(product) ? planLabel(product, plan) : t(`price.${plan}`)}
              </div>
              <p className="mt-2 min-h-12 text-sm text-white/60">{t(`price.${plan}.sub.${product}`)}</p>
              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-5xl">{money(price(config, product, plan))}</span>
                <span className="pb-1.5 text-sm font-semibold text-white/60">{cur}</span>
              </div>
              <p className="mt-2 text-xs text-white/45">{onePlan ? t("tag.one") : isSized(product) ? t("x.note", { price: money(Number(config.extra_price ?? 20)) }) : t(`price.note.${plan}`)}</p>
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
                  variant={hi || multi ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    addToCart({ product, plan, qty: 1, design: product === "card" ? "pvc" : product === "stand" ? "remotap" : undefined });
                    setCartOpen(true);
                  }}
                >
                  <NfcWaves className="size-4" /> {t("cart.add")}
                </Button>
                <Button asChild variant="ghost">
                  <NavLink href={onePlan ? `/product/${product}` : `/product/${product}?plan=${plan}`}>{t("shop.view")}</NavLink>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Section heading. `eyebrow` is kept for old callers but not shown: one label above every heading read as template filler. */
export function SectionHead({ title, lead, className, center = false }: { eyebrow?: string; title: React.ReactNode; lead?: string; className?: string; center?: boolean }) {
  return (
    <div className={cn("reveal mb-12 max-w-3xl", center && "mx-auto text-center", className)}>
      <h2 className="font-display text-3xl uppercase leading-[1.08] tracking-wide sm:text-5xl">{title}</h2>
      {lead && <p className="mt-5 text-base text-white/60 sm:text-lg">{lead}</p>}
    </div>
  );
}
