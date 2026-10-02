"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Minus, Plus, Trash2, Menu, X, Sparkles, MessageCircle } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Logo, NfcWaves, Wordmark } from "@/components/site/brand";
import { ProductThumb } from "@/components/site/product-visuals";
import { itemKey, price } from "@/lib/store";
import { lookName } from "@/lib/stands";
import { cn } from "@/lib/utils";

/* ---------------- Marquee (announcement bar, shuffle.store style) ---------------- */
export function Marquee({ className, big = false }: { className?: string; big?: boolean }) {
  const { t } = useStore();
  const items = ["mq.1", "mq.2", "mq.3", "mq.4", "mq.5", "mq.6"].map((k) => t(k));
  const row = (
    <div className="flex shrink-0 items-center" aria-hidden>
      {items.map((s, i) => (
        <span key={i} className={cn("flex items-center whitespace-nowrap", big ? "gap-10 px-10" : "gap-6 px-6")}>
          <span>{s}</span>
          {big ? <NfcWaves className="size-8 text-brand-purple" /> : <Sparkles className="size-3.5 text-brand-cyan" />}
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("relative flex overflow-hidden", className)} dir="ltr">
      <span className="sr-only">{items.join(" · ")}</span>
      <div className="flex animate-marquee" dir="ltr">
        {row}
        {row}
      </div>
    </div>
  );
}

/* ---------------- Header ---------------- */
export function Header() {
  const { t, lang, setLang, cartCount, setCartOpen } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(scrollY > 8);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  const nav = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/stands", label: t("nav.stands") },
    { href: "/how", label: t("nav.how") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/demo", label: t("nav.demo") },
    { href: "/faq", label: t("nav.faq") },
  ];

  return (
    <>
      <div className="relative z-50 bg-gradient-to-r from-brand-purple to-brand-blue py-2 text-[12px] font-semibold tracking-wide text-white">
        <Marquee />
      </div>
      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-colors duration-300",
          scrolled ? "border-white/10 bg-ink/75 backdrop-blur-xl" : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink href="/" aria-label="RemoTap home" className="shrink-0">
            <Logo />
          </NavLink>
          <nav className="hidden items-center gap-2 lg:flex">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} className="tap rt-box rounded-full bg-[#0b0b26]/80 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-[#15153f] hover:text-white">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="tap rt-box grid h-10 min-w-10 place-items-center rounded-full bg-[#0b0b26]/80 px-3 text-sm font-bold text-white/90 hover:bg-[#15153f]"
              aria-label={lang === "ar" ? "Switch to English" : "التحويل للعربي"}
            >
              {lang === "ar" ? "EN" : "ع"}
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="tap rt-box relative grid h-10 w-10 place-items-center rounded-full bg-[#0b0b26]/80 text-white hover:bg-[#15153f]"
              aria-label={`${t("nav.cart")} (${cartCount})`}
            >
              <ShoppingBag className="size-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-cyan px-1 text-[11px] font-extrabold text-ink">
                  {cartCount}
                </span>
              )}
            </button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <NavLink href="/shop">{t("nav.shop")}</NavLink>
            </Button>
            <button
              className="tap rt-box grid h-10 w-10 place-items-center rounded-full bg-[#0b0b26]/80 lg:hidden"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-label="Menu"
            >
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="grid gap-2.5 border-t border-white/10 bg-ink/95 px-4 pb-6 pt-4 backdrop-blur-xl lg:hidden">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} onClick={() => setMenu(false)} className="tap rt-box block rounded-2xl bg-[#0b0b26] px-5 py-4 font-display text-base tracking-wide">
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <CartSheet />
    </>
  );
}

/* ---------------- Cart drawer ---------------- */
export function CartSheet() {
  const { t, cart, cartOpen, setCartOpen, config, money, cur, setQty, removeItem, cartTotal, lang } = useStore();
  const side = lang === "ar" ? "left" : "right";
  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side={side} closeLabel={t("cart.keep")} className={side === "left" ? "start-0 end-auto" : ""}>
        <div className="border-b border-white/10 px-6 py-5">
          <SheetTitle>{t("cart.title")}</SheetTitle>
          <SheetDescription className="text-sm text-white/50">{t("cart.delnote")}</SheetDescription>
        </div>
        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <NfcWaves className="size-14 text-brand-purple" />
            <p className="text-white/70">{t("cart.empty")}</p>
            <Button asChild onClick={() => setCartOpen(false)}>
              <NavLink href="/shop">{t("cart.empty.cta")}</NavLink>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-white/10 overflow-y-auto px-6">
              {cart.map((i) => {
                const k = itemKey(i);
                const look = lookName(i.product, i.design, lang);
                return (
                  <li key={k} className="flex gap-4 py-5">
                    <ProductThumb product={i.product} design={i.design} className="h-20 w-24 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{t(`prod.${i.product}`)}</div>
                          <div className="text-xs text-white/55">
                            {i.plan === "plus" ? "Plus" : "Basic"}
                            {look ? ` · ${look}` : ""}
                          </div>
                        </div>
                        <div className="text-sm font-bold whitespace-nowrap">
                          {money(price(config, i.product, i.plan) * i.qty)} {cur}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Qty value={i.qty} onChange={(q) => setQty(k, q)} />
                        <button onClick={() => removeItem(k)} className="tap rounded-full p-2 text-white/50 hover:text-white" aria-label={t("cart.remove")}>
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-white/10 p-6">
              <div className="mb-4 flex items-center justify-between text-lg font-bold">
                <span>{t("cart.sub")}</span>
                <span>
                  {money(cartTotal)} {cur}
                </span>
              </div>
              <Button asChild size="lg" className="w-full" onClick={() => setCartOpen(false)}>
                <NavLink href="/order">
                  <NfcWaves className="size-5" /> {t("cart.checkout")}
                </NavLink>
              </Button>
              <button onClick={() => setCartOpen(false)} className="mt-3 w-full py-2 text-sm text-white/60 hover:text-white">
                {t("cart.keep")}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Qty({ value, onChange, max = 20, className }: { value: number; onChange: (n: number) => void; max?: number; className?: string }) {
  return (
    <div className={cn("inline-flex items-center rounded-full border border-white/15", className)} dir="ltr">
      <button type="button" className="tap grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" onClick={() => onChange(Math.max(1, value - 1))} aria-label="−">
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
      <button type="button" className="tap grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" onClick={() => onChange(Math.min(max, value + 1))} aria-label="+">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/* ---------------- Footer ---------------- */
export function Footer() {
  const { t, waLink } = useStore();
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-white/10 bg-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-white/55">{t("foot.tag")}</p>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/40">{t("foot.shop")}</h3>
          <ul className="space-y-3 text-sm text-white/75">
            <li><NavLink href="/product/card" className="hover:text-white">{t("prod.card")}</NavLink></li>
            <li><NavLink href="/product/stand" className="hover:text-white">{t("prod.stand")}</NavLink></li>
            <li><NavLink href="/stands" className="hover:text-white">{t("st.eyebrow")}</NavLink></li>
            <li><NavLink href="/product/instapay" className="hover:text-white">{t("prod.instapay")}</NavLink></li>
            <li><NavLink href="/shop" className="hover:text-white">{t("shop.page")}</NavLink></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/40">{t("foot.help")}</h3>
          <ul className="space-y-3 text-sm text-white/75">
            <li><NavLink href="/how" className="hover:text-white">{t("nav.how")}</NavLink></li>
            <li><NavLink href="/faq" className="hover:text-white">{t("nav.faq")}</NavLink></li>
            <li><NavLink href="/demo" className="hover:text-white">{t("nav.demo")}</NavLink></li>
            <li><NavLink href="/pricing" className="hover:text-white">{t("nav.pricing")}</NavLink></li>
            <li><NavLink href="/why" className="hover:text-white">{t("cmp.eyebrow")}</NavLink></li>
            <li><NavLink href="/for" className="hover:text-white">{t("aud.eyebrow")}</NavLink></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/40">{t("foot.follow")}</h3>
          <p className="mb-4 text-sm text-white/65">{t("foot.drops")}</p>
          <Button asChild variant="whatsapp" size="sm">
            <a href={waLink(t("foot.drops.msg"))} target="_blank" rel="noopener">
              <MessageCircle /> {t("foot.drops.btn")}
            </a>
          </Button>
        </div>
      </div>
      <div className="pointer-events-none select-none px-4 pb-2 text-center leading-none" aria-hidden>
        <Wordmark className="block text-[17vw] tracking-[0.06em] opacity-[0.07]" mono />
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/40">{t("foot.rights")}</div>
    </footer>
  );
}

/* ---------------- Floating WhatsApp ---------------- */
export function WhatsAppFloat() {
  const { t, waLink } = useStore();
  return (
    <a
      href={waLink(t("o.chat.msg", { product: t("o.card"), plan: "Plus" }))}
      target="_blank"
      rel="noopener"
      aria-label="WhatsApp"
      className="tap fixed bottom-5 end-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-[#04220f] shadow-[0_10px_30px_-5px_rgba(37,211,102,.6)] transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden>
        <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM12 0a12 12 0 0 0-10.3 18L0 24l6.2-1.6A12 12 0 1 0 12 0z" />
      </svg>
    </a>
  );
}
