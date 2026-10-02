"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Info, Palette, RotateCw, Shuffle, ShoppingBag, Truck } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink, useNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import CardsShader from "@/components/ui/cards-shader-effect";
import { CARD_DESIGNS } from "@/components/ui/cards-shader-effect-utils/shaders-map";
import { NfcWaves } from "@/components/site/brand";
import { InstaPayCard, StandPlate, StandVisual } from "@/components/site/product-visuals";
import { STAND_STYLES, standStyle } from "@/lib/stands";
import { ProductTile } from "@/components/site/shop";
import { Qty } from "@/components/site/chrome";
import { FEATURES, PRODUCTS, plansFor, price, type PlanKey, type ProductKey } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function ProductClient({ product }: { product: ProductKey }) {
  const { t, config, money, cur, addToCart, setCartOpen, lang } = useStore();
  const nav = useNav();
  const qp = nav.params;
  const plans = plansFor(config, product);
  const [wantPlan, setPlan] = useState<PlanKey>("plus");
  const [qty, setQty] = useState(1);
  const [design, setDesign] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [style, setStyle] = useState("remotap");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const p = qp.get("plan");
    // Browser-only values (storage, URL, pointer type) are read after hydration of the static page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (p === "basic" || p === "plus") setPlan(p);
    const st = qp.get("style");
    if (st && STAND_STYLES.some((x) => x.id === st)) setStyle(st);
  }, [qp]);

  // A product sold in one plan only (the InstaPay card) always uses that plan.
  const plan: PlanKey = plans.includes(wantPlan) ? wantPlan : (plans[0] ?? "basic");
  const item = { product, plan, qty, design: product === "card" ? CARD_DESIGNS[design].id : product === "stand" ? style : undefined };
  const st = standStyle(style);
  const unit = price(config, product, plan);
  const others = PRODUCTS.filter((p) => p !== product && plansFor(config, p).length > 0);

  const add = () => {
    addToCart(item);
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 1800);
  };
  const buy = () => {
    addToCart(item);
    nav.push("/order");
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <NavLink href="/shop" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="size-4 rtl:rotate-180" /> {t("prod.back")}
        </NavLink>
      </div>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        {/* visual */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="noise relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#17173d] via-ink-2 to-ink sm:aspect-[5/4]">
            <div className="hero-grid pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/25 blur-[90px]" />
            {product === "card" && (
              <CardsShader
                design={design}
                onDesignChange={setDesign}
                flipped={flipped}
                onFlipChange={setFlipped}
                maxWidth={440}
                trackWindow={false}
                domain={config.domain || "remotap.com"}
              />
            )}
            {product === "stand" && <StandVisual className="absolute inset-0" design={style} />}
            {product === "instapay" && <InstaPayCard className="absolute inset-0" flipped={flipped} />}
          </div>
          {product !== "stand" && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
                <RotateCw /> {t("prod.flip")}
              </Button>
              {product === "card" && (
                <Button variant="outline" size="sm" onClick={() => setDesign((d) => (d + 1) % CARD_DESIGNS.length)}>
                  <Shuffle /> {t("prod.shuffle")}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* details */}
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-cyan">{t("hero.store")}</div>
          <h1 className="mt-3 font-display text-4xl uppercase leading-tight tracking-wide sm:text-5xl">{product === "stand" && style !== "remotap" ? st.name[lang] : t(`prod.${product}`)}</h1>
          <p className="mt-4 text-lg text-white/65">{product === "stand" ? st.desc[lang] : t(`prod.${product}.short`)}</p>
          {product === "stand" && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-purple/50 bg-brand-purple/15 px-3 py-1.5 text-xs font-semibold">
              <Palette className="size-3.5 text-brand-cyan" /> {t("tag.custom")}
            </span>
          )}
          <div className="mt-6 flex items-end gap-2">
            <span className="font-display text-4xl">{money(unit)}</span>
            <span className="pb-1 text-sm font-semibold text-white/60">{cur}</span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/55">
            <Truck className="size-4 text-brand-cyan" /> {t("prod.delfee", { fee: money(Number(config.delivery_fee) || 0) })}
          </p>

          {/* plan */}
          {plans.length > 1 && (
            <fieldset className="mt-8">
              <legend className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">{t("prod.plan")}</legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {plans.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={plan === p}
                    onClick={() => {
                      setPlan(p);
                      nav.replace(`/product/${product}?plan=${p}${product === "stand" ? `&style=${style}` : ""}`);
                    }}
                    className={cn(
                      "relative rounded-2xl border p-4 text-start transition",
                      plan === p ? "border-brand-purple bg-brand-purple/10 ring-1 ring-brand-purple" : "border-white/12 hover:border-white/30",
                    )}
                  >
                    {p === "plus" && (
                      <span className="absolute -top-2.5 end-3 rounded-full bg-brand-cyan px-2 py-0.5 text-[10px] font-bold uppercase text-ink">{t("tag.best")}</span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm uppercase tracking-wide">{p === "plus" ? "Plus" : "Basic"}</span>
                      <span className="font-bold">
                        {money(price(config, product, p))} <span className="text-xs text-white/55">{cur}</span>
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-white/55">{t(`o.${p}.d`)}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 flex gap-2 text-xs text-white/50">
                <Info className="mt-0.5 size-3.5 shrink-0" /> {t("plan.help")}
              </p>
            </fieldset>
          )}

          {product === "stand" && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
                {t("prod.style")}: <span className="text-white">{st.name[lang]}</span>
              </legend>
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7" role="radiogroup">
                {STAND_STYLES.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={style === x.id}
                    aria-label={x.name[lang]}
                    title={x.name[lang]}
                    onClick={() => {
                      setStyle(x.id);
                      nav.replace(`/product/stand?plan=${plan}&style=${x.id}`);
                    }}
                    className={cn("rounded-xl border-2 p-1 transition hover:scale-105", style === x.id ? "border-white" : "border-white/15")}
                  >
                    <StandPlate design={x.id} className="w-full rounded-lg" />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/45">{t("prod.style.note")}</p>
            </fieldset>
          )}

          {product === "card" && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
                {t("prod.design")}: <span className="text-white">{CARD_DESIGNS[design].name[lang]}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5" role="radiogroup">
                {CARD_DESIGNS.map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={design === i}
                    aria-label={d.name[lang]}
                    title={d.name[lang]}
                    onClick={() => setDesign(i)}
                    className={cn("h-9 w-12 rounded-lg border-2 transition hover:scale-105", design === i ? "border-white" : "border-white/15")}
                    style={{ background: d.css }}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-white/45">{t("prod.design.note")}</p>
            </fieldset>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Qty value={qty} onChange={setQty} max={config.max_quantity} className="h-12" />
            <Button size="lg" variant="outline" className="flex-1" onClick={add}>
              {added ? <Check /> : <ShoppingBag />} {added ? t("cart.added") : t("cart.add")}
            </Button>
          </div>
          <Button size="lg" className="mt-3 w-full" onClick={buy}>
            <NfcWaves className="size-5" /> {t("cart.buy")} · {money(unit * qty)} {cur}
          </Button>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="font-display text-sm uppercase tracking-wider">{t("prod.get")}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {FEATURES[product][plan]
                .filter(([, on]) => on)
                .map(([k]) => (
                  <li key={k} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" /> {t(k)}
                  </li>
                ))}
            </ul>
          </div>
          <div className="mt-4 flex gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <Truck className="size-5 shrink-0 text-brand-cyan" />
            <div>
              <h2 className="font-display text-sm uppercase tracking-wider">{t("prod.delivery")}</h2>
              <p className="mt-2 text-sm text-white/60">{t("prod.delivery.b")}</p>
            </div>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="mx-auto max-w-7xl border-t border-white/10 px-4 py-16 sm:px-6">
          <h2 className="mb-10 font-display text-2xl uppercase tracking-wide">{t("prod.other")}</h2>
          <div className="grid gap-x-3 gap-y-10 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3">
            {others.map((p, i) => (
              <ProductTile key={p} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* phone: price + buy always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/90 px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3 pe-16">
          <div className="min-w-0">
            <div className="truncate text-xs text-white/55">
              {t(`prod.${product}`)} {plans.length > 1 ? (plan === "plus" ? "Plus" : "Basic") : ""}
            </div>
            <div className="font-display text-lg">
              {money(unit * qty)} <span className="text-xs text-white/60">{cur}</span>
            </div>
          </div>
          <Button className="ms-auto" onClick={add}>
            <ShoppingBag /> {t("cart.add")}
          </Button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </>
  );
}
