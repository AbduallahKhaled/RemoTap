"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Plus, ShieldCheck, Sparkles, Timer, Trash2, Upload, MessageCircle, PackageSearch } from "lucide-react";
import { useStore } from "@/components/providers";
import { NavLink, useNav, PREVIEW } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Qty } from "@/components/site/chrome";
import { NfcWaves } from "@/components/site/brand";
import { MiniCard, ProductThumb } from "@/components/site/product-visuals";
import { lookName, standStyle } from "@/lib/stands";
import { LINKS, LINK_PH, deliveryFee, isCarved, extraPrice, hasPage, isSized, itemKey, itemPrice, planLabel, plansFor, type PlanKey, type ProductKey, price } from "@/lib/store";
import { cn } from "@/lib/utils";

type Form = Record<string, string>;
const DRAFT = "rt-order-draft";
const PHONE_RE = /^(\+?20|0)?1[0125]\d{8}$/;

function loadDraft(): Form {
  try {
    return JSON.parse(localStorage.getItem(DRAFT) || "{}");
  } catch {
    return {};
  }
}

/** Order id used when the PHP backend can't be reached (WhatsApp fallback). */
function localId() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `RT-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function Field({ id, label, optional, children, hint, err, opt }: { id: string; label: string; optional?: boolean; children: React.ReactNode; hint?: string; err?: string; opt?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-white/80">
        {label} {optional && <span className="font-normal text-white/40">{opt}</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-white/40">{hint}</p>}
      {err && <p className="mt-1.5 text-xs font-semibold text-destructive">{err}</p>}
    </div>
  );
}

export default function OrderClient() {
  const { t, lang, config, money, cur, cart, addToCart, setQty, removeItem, clearCart, cartTotal, waLink, source } = useStore();
  const qp = useNav().params;
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Form>({ c_area: "cairo", p_lang: "en", one_type: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; total: number; offline: boolean; items: string } | null>(null);
  const [copied, setCopied] = useState("");
  // "I've sent the money" on the payment screen: idle -> busy -> sent | error
  const [paid, setPaid] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [proof, setProof] = useState<File | null>(null);
  const [payRef, setPayRef] = useState("");
  const printTouched = useRef(false);
  const top = useRef<HTMLDivElement>(null);
  const presetDone = useRef(false);

  // Restore draft; ?product=&plan= (old links) add that product when the cart is empty
  useEffect(() => {
    // Browser-only values (storage, URL, pointer type) are read after hydration of the static page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF((cur) => ({ ...cur, ...loadDraft() }));
  }, []);
  useEffect(() => {
    if (presetDone.current) return;
    const p = qp.get("product");
    const pl = qp.get("plan");
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem("rt-cart") || "[]");
      } catch {
        return [];
      }
    })();
    if ((p === "card" || p === "stand") && saved.length === 0 && cart.length === 0) {
      addToCart({ product: p, plan: pl === "basic" ? "basic" : "plus", qty: 1, design: p === "card" ? "liquid" : undefined });
    }
    presetDone.current = true;
  }, [qp, cart.length, addToCart]);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT, JSON.stringify(f));
    } catch {}
  }, [f]);

  // "plus" here means: the order gets a full page with all links (a Plus card, or a stand/coaster with the landing page add-on).
  const plan: PlanKey = cart.some(hasPage) ? "plus" : "basic";
  const mainProduct: ProductKey = (cart.find(hasPage) ?? cart[0])?.product ?? "card";
  const linkTypes = useMemo(() => {
    const ps = Array.from(new Set([mainProduct, ...cart.map((i) => i.product)]));
    return Array.from(new Set(ps.flatMap((p) => LINKS[p])));
  }, [cart, mainProduct]);
  // Name/title examples: the InstaPay card is for shops, so it uses the stand's.
  const phProduct = mainProduct === "card" ? "card" : "stand";
  // A ready stand design (Google, Menu…) preselects the link it opens.
  const standLink = cart.find((i) => i.product === "stand" && i.design && i.design !== "remotap")?.design;
  const preType = standLink ? standStyle(standLink).link : "";
  const oneType = f.one_type && linkTypes.includes(f.one_type) ? f.one_type : linkTypes.includes(preType) ? preType : linkTypes[0];
  const delivery = deliveryFee(config, f.c_area);
  // Discount code: the server checks it again when the order is placed.
  const [code, setCode] = useState("");
  const [disc, setDisc] = useState<{ code: string; type: "percent" | "fixed"; value: number; min: number } | null>(null);
  const [codeErr, setCodeErr] = useState("");
  // Same rule as rt_coupon_check() in backend/lib-store.php, so the amount follows cart changes.
  const discount = !disc || cartTotal < disc.min ? 0 : disc.type === "percent" ? Math.floor((cartTotal * Math.min(100, disc.value)) / 100) : Math.min(cartTotal, disc.value);
  const total = cartTotal - discount + delivery;
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const set = (k: string, v: string) => {
    setF((cur) => {
      const next = { ...cur, [k]: v };
      if (k === "p_name" && !printTouched.current) next.print_text = v.slice(0, 40);
      if (k === "one_value") {
        const low = v.toLowerCase();
        const map: [string, string][] = [
          ["linkedin", "linkedin"], ["instagram", "instagram"], ["tiktok", "tiktok"], ["facebook", "facebook"], ["fb.com", "facebook"],
          ["instapay", "instapay"], ["ipn.eg", "instapay"], ["wa.me", "whatsapp"], ["g.page", "google"], ["maps.app", "google"], ["google.", "google"],
        ];
        const hit = map.find(([m, ty]) => low.includes(m) && linkTypes.includes(ty));
        if (hit) next.one_type = hit[1];
        else if (/^@?[^@\s]+@[^@\s]+\.[a-z]+$/.test(low) && linkTypes.includes("email")) next.one_type = "email";
      }
      return next;
    });
    if (errs[k]) setErrs((e) => ({ ...e, [k]: "" }));
  };
  const v = (k: string) => (f[k] ?? "").trim();
  /** "Plus"/"Basic", or nothing for a product sold in one plan (the InstaPay card). */
  const planName = (i: { product: ProductKey; plan: PlanKey }) => (plansFor(config, i.product).length > 1 ? planLabel(i.product, i.plan) : "");

  const itemLabel = useCallback(
    (i: (typeof cart)[number]) => {
      const look = lookName(i.product, i.design, "en");
      const pn = plansFor(config, i.product).length > 1 ? ` ${planLabel(i.product, i.plan)}` : "";
      const ex = (i.extras ?? []).map((e) => t(`x.${e}`)).join(", ");
      return `${t(`prod.${i.product}`)}${pn}${look ? ` (${look})` : ""}${ex ? ` + ${ex}` : ""} × ${i.qty}`;
    },
    [t, config],
  );

  function validate(n: number) {
    const e: Record<string, string> = {};
    if (n === 1 && cart.length === 0) e.cart = t("o.empty");
    if (n === 2) {
      if (!v("p_name")) e.p_name = t("o.req");
      if (!v("print_text")) e.print_text = t("o.req");
      if (plan === "basic" && !v("one_value")) e.one_value = t("o.req");
      if (plan === "plus" && !linkTypes.some((k) => v(`l_${k}`))) e.links = t("o.needlink");
    }
    if (n === 3) {
      if (!v("c_name")) e.c_name = t("o.req");
      if (!PHONE_RE.test(v("c_phone").replace(/[\s-]/g, ""))) e.c_phone = t("o.badphone");
      if (v("c_email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("c_email"))) e.c_email = t("o.bademail");
      if (v("c_address").length < 8) e.c_address = t("o.req");
    }
    if (n === 4 && !agree) e.agree = t("o.needagree");
    setErrs(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(first === "links" ? `l_${linkTypes[0]}` : first)?.focus();
    return !first;
  }

  function go(n: number) {
    setStep(n);
    const el = top.current;
    if (el) {
      const y = el.getBoundingClientRect().top + scrollY - 90;
      if (scrollY > y) scrollTo({ top: y, behavior: "smooth" });
    }
  }

  function next() {
    if (!validate(step)) return;
    if (step === 2 && !v("c_name") && mainProduct === "card") setF((c) => ({ ...c, c_name: c.p_name ?? "" }));
    if (step < 4) return go(step + 1);
    submit();
  }

  function linkList(): [string, string][] {
    if (plan === "basic") return [[oneType, v("one_value")]];
    return linkTypes.map((k) => [k, v(`l_${k}`)] as [string, string]).filter(([, x]) => x);
  }

  async function applyCode(raw: string) {
    const c = raw.trim().toUpperCase();
    if (!c) {
      setDisc(null);
      setCodeErr("");
      return;
    }
    try {
      const r = await fetch(`${PREVIEW ? "" : "/"}api/coupon.php?code=${encodeURIComponent(c)}&subtotal=${cartTotal}`);
      const j = await r.json();
      if (j?.ok) {
        setDisc({ code: j.code, type: j.type === "fixed" ? "fixed" : "percent", value: Number(j.value) || 0, min: Number(j.min) || 0 });
        setCodeErr("");
      } else {
        setDisc(null);
        setCodeErr(j?.error === "min" ? t("o.code.min", { min: j.min }) : t("o.code.bad"));
      }
    } catch {
      setCodeErr(t("o.code.off"));
    }
  }

  async function submit() {
    setBusy(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, val]) => {
      if (k.startsWith("l_") && !linkTypes.includes(k.slice(2))) return;
      fd.set(k, val);
    });
    fd.set("one_type", oneType);
    fd.set("items", JSON.stringify(cart.map((i) => ({ product: i.product, plan: i.plan, qty: i.qty, design: i.design ?? "", extras: i.extras ?? [] }))));
    // Kept for the old order format: the main line
    const main = cart.find(hasPage) ?? cart[0];
    fd.set("product", main.product);
    fd.set("plan", plan);
    fd.set("qty", String(count));
    fd.set("lang", lang);
    fd.set("source", source());
    fd.set("website_hp", (document.getElementById("website_hp") as HTMLInputElement)?.value ?? "");
    if (logo) fd.set("logo", logo);
    fd.set("coupon", discount > 0 && disc ? disc.code : "");
    const items = cart.map(itemLabel).join("\n");
    let res: { id: string; total: number; offline: boolean };
    try {
      const r = await fetch(PREVIEW ? "api/order.php" : "/api/order.php", { method: "POST", body: fd });
      const j = await r.json();
      if (!j?.ok && String(j?.error).startsWith("coupon_")) {
        // The code ended while the customer was checking out: drop it and let them place the order again.
        setDisc(null);
        setCodeErr(t("o.code.bad"));
        setBusy(false);
        return;
      }
      if (!j?.ok) throw new Error(j?.error || "fail");
      res = { id: j.id, total: j.total ?? total, offline: false };
    } catch {
      // Server unreachable: keep the sale. The WhatsApp message carries every detail.
      res = { id: localId(), total, offline: true };
    }
    setDone({ ...res, items });
    try {
      localStorage.removeItem(DRAFT);
    } catch {}
    clearCart();
    setBusy(false);
    go(5);
  }

  const waMessage = useMemo(() => {
    if (!done) return "";
    let msg = t("p.wamsg2", { id: done.id, items: done.items, total: done.total, name: v("c_name") });
    if (done.offline) {
      const extra = ["", "-----", `${t("o.pname")}: ${v("p_name")}`, `${t("o.print")}: ${v("print_text")}`];
      linkList().forEach(([k, x]) => extra.push(`${t(`o.lt.${k}`)}: ${x}`));
      extra.push(`${t("o.phone")}: ${v("c_phone")}`, `${t("o.address")}: ${t(`o.${v("c_area")}`)}, ${v("c_address")}`);
      if (v("c_notes")) extra.push(`${t("o.notes")}: ${v("c_notes")}`);
      msg += "\n" + extra.join("\n");
    }
    return msg;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, lang]);

  const copy = (text: string, key: string) => {
    const ok = () => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1400);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, ok);
    else ok();
  };

  async function tellPaid() {
    if (!done) return;
    setPaid("busy");
    const fd = new FormData();
    fd.set("id", done.id);
    fd.set("phone", v("c_phone"));
    fd.set("ref", payRef);
    if (proof) fd.set("proof", proof);
    try {
      const r = await fetch(PREVIEW ? "api/paid.php" : "/api/paid.php", { method: "POST", body: fd });
      const j = await r.json();
      setPaid(j?.ok ? "sent" : "error");
    } catch {
      setPaid("error");
    }
  }

  /* ---------------- Payment screen ---------------- */
  if (step === 5 && done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6" ref={top}>
        <div className="text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-brand-purple to-brand-blue shadow-[0_0_60px_rgba(140,82,255,.6)]">
            <Check className="size-10" />
          </div>
          <h1 className="mt-6 font-display text-2xl uppercase leading-snug tracking-wide sm:text-3xl">{t("p.title")}</h1>
          <p className="mt-3 text-white/60">
            {t("p.lead")} <b className="font-mono text-white" dir="ltr">{done.id}</b>
          </p>
        </div>
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <div className="text-sm text-white/55">{t("p.amount")}</div>
          <div className="mt-1 font-display text-5xl">
            {money(done.total)} <span className="text-lg text-white/60">{cur}</span>
          </div>
          <button onClick={() => copy(String(done.total), "amt")} className="tap mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm">
            <Copy className="size-3.5" /> {copied === "amt" ? t("p.copied") : `${t("p.copy")} ${done.total} EGP`}
          </button>
        </div>
        <ol className="mt-6 space-y-4">
          <li className="rounded-3xl border border-white/10 bg-ink-2 p-6">
            <div className="flex items-center gap-3 font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-brand-purple font-display text-sm">1</span>
              {t("p.s1")}
            </div>
            <p className="mt-3 text-sm text-white/60">{t("p.s1.b")}</p>
            <div className="mt-4 space-y-2">
              {[config.instapay_handle, config.instapay_number].filter(Boolean).map((x, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <span className="font-mono text-sm" dir="ltr">
                    {x}
                  </span>
                  <button onClick={() => copy(x, `ip${i}`)} className="tap inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs">
                    <Copy className="size-3" /> {copied === `ip${i}` ? t("p.copied") : t("p.copy")}
                  </button>
                </div>
              ))}
            </div>
            {config.instapay_link ? (
              <Button asChild variant="outline" className="mt-4">
                <a href={config.instapay_link} target="_blank" rel="noopener">
                  <ExternalLink /> {t("p.open")}
                </a>
              </Button>
            ) : null}
          </li>
          <li className="rounded-3xl border border-white/10 bg-ink-2 p-6">
            <div className="flex items-center gap-3 font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-brand-purple font-display text-sm">2</span>
              {t("p.s2")}
            </div>
            <p className="mt-3 text-sm text-white/60">{t("p.s2.b")}</p>
            {!done.offline && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold">{t("paid.t")}</div>
                {paid === "sent" ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-brand-cyan" role="status">
                    <Check className="size-4" /> {t("paid.ok")}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-white/55">{t("paid.b")}</p>
                    <label className="tap mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/75 hover:border-brand-cyan">
                      <Upload className="size-4" />
                      <span className="truncate">{proof ? proof.name : t("paid.file")}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
                    </label>
                    <input value={payRef} onChange={(e) => setPayRef(e.target.value)} maxLength={60} dir="ltr" placeholder={t("paid.ref")} aria-label={t("paid.ref")} className="mt-2 h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm outline-none placeholder:text-white/30 focus:border-brand-purple" />
                    <Button onClick={tellPaid} disabled={paid === "busy"} size="lg" className="mt-3 w-full">
                      <Check /> {t("paid.btn")}
                    </Button>
                    {paid === "error" && <p className="mt-2 text-xs text-red-300" role="alert">{t("paid.err")} {t("paid.img")}</p>}
                  </>
                )}
              </div>
            )}
            <Button asChild variant="whatsapp" size="lg" className="mt-4 w-full">
              <a href={waLink(waMessage)} target="_blank" rel="noopener">
                <MessageCircle /> {t("p.wa")}
              </a>
            </Button>
          </li>
          <li className="rounded-3xl border border-white/10 bg-ink-2 p-6">
            <div className="flex items-center gap-3 font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-brand-purple font-display text-sm">3</span>
              {t("p.s3")}
            </div>
            <p className="mt-3 text-sm text-white/60">{t("p.s3.b")}</p>
          </li>
        </ol>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!done.offline && (
            <Button asChild variant="outline">
              <NavLink href={`/track?id=${done.id}`}>
                <PackageSearch /> {t("p.track")}
              </NavLink>
            </Button>
          )}
          <Button asChild variant="ghost">
            <NavLink href="/">{t("p.home")}</NavLink>
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Steps ---------------- */
  const input = "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-brand-purple focus:bg-white/[0.06] focus:ring-2 focus:ring-brand-purple/30 aria-[invalid=true]:border-destructive";
  const text = (id: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={id} name={id} value={f[id] ?? ""} onChange={(e) => set(id, e.target.value)} aria-invalid={!!errs[id]} className={input} {...extra} />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" ref={top}>
      <NavLink href="/shop" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("cart.keep")}
      </NavLink>
      <h1 className="mt-4 font-display text-3xl uppercase tracking-wide sm:text-5xl">{t("o.title")}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/55">
        {t("o.chat")}
        <a className="font-semibold text-[#25D366] underline-offset-4 hover:underline" target="_blank" rel="noopener" href={waLink(t("o.chat.msg", { product: t(`o.${mainProduct}`), plan: plan === "plus" ? "Plus" : "Basic" }))}>
          {t("o.chat.btn")}
        </a>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          {/* progress */}
          <div className="mb-8">
            <div className="sr-only" aria-live="polite">{t("o.stepof", { n: step })}</div>
            <ol className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    disabled={n >= step}
                    onClick={() => go(n)}
                    aria-current={n === step ? "step" : undefined}
                    className={cn("group block w-full text-start", n < step && "cursor-pointer")}
                  >
                    <span className={cn("block h-1.5 rounded-full transition-colors duration-500", n <= step ? "bg-gradient-to-r from-brand-purple to-brand-blue" : "bg-white/10")} />
                    <span
                      className={cn(
                        "mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider sm:text-xs",
                        n === step ? "text-white" : n < step ? "text-brand-cyan group-hover:underline" : "text-white/35",
                      )}
                    >
                      {n < step ? <Check className="size-3.5 shrink-0" /> : <span className="hidden sm:inline">{n}.</span>}
                      {t(`o.step.${n}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
            noValidate
            id="order-form"
            className="rounded-[2rem] border border-white/10 bg-ink-2/70 p-6 sm:p-8"
          >
            <input type="text" id="website_hp" name="website_hp" tabIndex={-1} autoComplete="off" className="absolute -start-[9999px]" aria-hidden />

            {step === 1 && (
              <div>
                <h2 className="font-display text-xl uppercase tracking-wide">{t("o.s1.t")}</h2>
                <p className="mt-2 text-sm text-white/55">{t("o.s1.l")}</p>
                {cart.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-8 text-center">
                    <p className="text-white/60">{t("o.empty")}</p>
                    <Button asChild className="mt-5">
                      <NavLink href="/shop">{t("cart.empty.cta")}</NavLink>
                    </Button>
                  </div>
                ) : (
                  <ul className="mt-6 divide-y divide-white/10">
                    {cart.map((i) => {
                      const k = itemKey(i);
                      const look = lookName(i.product, i.design, lang);
                      return (
                        <li key={k} className="flex flex-wrap items-center gap-4 py-5">
                          <ProductThumb product={i.product} design={i.design} className="h-20 w-24 rounded-xl" />
                          <div className="min-w-[140px] flex-1">
                            <div className="font-semibold">
                              {t(`prod.${i.product}`)} <span className="text-grad">{planName(i)}</span>
                            </div>
                            <div className="text-xs text-white/50">
                              {isSized(i.product)
                                ? (i.extras ?? []).map((e) => t(`x.${e}`)).join(" · ") || t("o.basic.d")
                                : plansFor(config, i.product).length > 1
                                  ? t(`o.${i.plan}.d`)
                                  : t(`price.basic.sub.${i.product}`)}
                              {look ? ` · ${look}` : ""}
                            </div>
                            {!hasPage(i) && isSized(i.product) && (
                              <button
                                type="button"
                                className="mt-2 text-xs font-semibold text-brand-cyan hover:underline"
                                onClick={() => {
                                  removeItem(k);
                                  addToCart({ ...i, extras: [...(i.extras ?? []), "page"] });
                                }}
                              >
                                <Sparkles className="me-1 inline size-3" />
                                {t("x.page.add")} (+{money(extraPrice(config))} {cur})
                              </button>
                            )}
                            {i.plan === "basic" && !isSized(i.product) && plansFor(config, i.product).includes("plus") && (
                              <button
                                type="button"
                                className="mt-2 text-xs font-semibold text-brand-cyan hover:underline"
                                onClick={() => {
                                  removeItem(k);
                                  addToCart({ ...i, plan: "plus" });
                                }}
                              >
                                <Sparkles className="me-1 inline size-3" />
                                {t("o.nudge.btn")} (+{money(price(config, i.product, "plus") - price(config, i.product, "basic"))} {cur})
                              </button>
                            )}
                          </div>
                          <Qty value={i.qty} onChange={(q) => setQty(k, q)} max={config.max_quantity} />
                          <div className="w-24 text-end font-bold">
                            {money(itemPrice(config, i) * i.qty)} {cur}
                          </div>
                          <button type="button" onClick={() => removeItem(k)} className="tap rounded-full p-2 text-white/40 hover:text-white" aria-label={t("cart.remove")}>
                            <Trash2 className="size-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {errs.cart && <p className="mt-2 text-sm font-semibold text-destructive">{errs.cart}</p>}
                {cart.length > 0 && (
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <NavLink href="/shop">
                      <Plus /> {t("o.addmore")}
                    </NavLink>
                  </Button>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl uppercase tracking-wide">{t("o.s2.t")}</h2>
                  <p className="mt-2 text-sm text-white/55">{t(plan === "plus" ? "o.s2.l.plus" : "o.s2.l.basic")}</p>
                  {cart.length > 1 && <p className="mt-2 text-xs text-brand-cyan">{t("o.oneperorder")}</p>}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="p_name" err={errs.p_name} opt={t("o.optional")} label={t("o.pname")}>
                    {text("p_name", { maxLength: 60, placeholder: t(`o.pname.ph.${phProduct}`) })}
                  </Field>
                  <Field id="print_text" err={errs.print_text} opt={t("o.optional")} label={t("o.print")} hint={t("o.print.h") + (cart.some((i) => i.product === "card" && isCarved(i.design)) ? " " + t("ct.carve.order") : "")}>
                    <input
                      id="print_text"
                      value={f.print_text ?? ""}
                      maxLength={40}
                      placeholder={t("o.print.ph")}
                      aria-invalid={!!errs.print_text}
                      className={input}
                      onChange={(e) => {
                        printTouched.current = true;
                        set("print_text", e.target.value);
                      }}
                    />
                  </Field>
                </div>
                {cart.some((i) => i.product === "card") && (
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <MiniCard design={cart.find((i) => i.product === "card")?.design} name={v("print_text") || t(`o.pname.ph.card`)} className="w-40 shrink-0" />
                    <p className="text-xs text-white/50">{t("prod.design.note")}</p>
                  </div>
                )}
                {plan === "plus" && (
                  <>
                    <Field id="p_title" err={errs.p_title} opt={t("o.optional")} label={t("o.ptitle")} optional>
                      {text("p_title", { maxLength: 80, placeholder: t(`o.ptitle.ph.${phProduct}`) })}
                    </Field>
                    <Field id="p_bio" err={errs.p_bio} opt={t("o.optional")} label={t("o.bio")} optional>
                      <textarea id="p_bio" value={f.p_bio ?? ""} onChange={(e) => set("p_bio", e.target.value)} maxLength={220} rows={2} placeholder={t("o.bio.ph")} className={cn(input, "h-auto py-3")} />
                    </Field>
                  </>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="logo" err={errs.logo} opt={t("o.optional")} label={t("o.logo")} optional hint={t("o.logo.h")}>
                    <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 px-3 text-sm text-white/70 hover:border-white/40">
                      <span className="grid size-8 place-items-center rounded-lg bg-white/10 bg-cover bg-center" style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : {}}>
                        {!logoUrl && <Upload className="size-4" />}
                      </span>
                      <span className="truncate">{logo?.name || t("o.logo.pick")}</span>
                      <input
                        id="logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            setErrs((x) => ({ ...x, logo: t("o.bigfile") }));
                            e.target.value = "";
                            return;
                          }
                          setErrs((x) => ({ ...x, logo: "" }));
                          setLogo(file);
                          setLogoUrl(URL.createObjectURL(file));
                        }}
                      />
                    </label>
                  </Field>
                  {plan === "plus" && (
                    <Field id="p_lang" err={errs.p_lang} opt={t("o.optional")} label={t("o.pagelang")}>
                      <select id="p_lang" value={f.p_lang ?? "en"} onChange={(e) => set("p_lang", e.target.value)} className={input}>
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                        <option value="both">English + العربية</option>
                      </select>
                    </Field>
                  )}
                </div>

                {plan === "basic" ? (
                  <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                    <Field id="one_type" err={errs.one_type} opt={t("o.optional")} label={t("o.linktype")}>
                      <select id="one_type" value={oneType} onChange={(e) => set("one_type", e.target.value)} className={input}>
                        {linkTypes.map((k) => (
                          <option key={k} value={k}>
                            {t(`o.lt.${k}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field id="one_value" err={errs.one_value} opt={t("o.optional")} label={t("o.onelink")}>
                      {text("one_value", { maxLength: 300, placeholder: oneType === "instapay" ? t("o.lt.instapay.ph") : (LINK_PH[oneType] ?? t("o.link.ph")), dir: "ltr" })}
                    </Field>
                    {cart.some((i) => plansFor(config, i.product).includes("plus")) && (
                      <div className="rounded-2xl border border-brand-purple/30 bg-brand-purple/10 p-4 text-sm sm:col-span-2">
                        <span dangerouslySetInnerHTML={{ __html: t("o.nudge") }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mb-3 text-sm font-semibold text-white/80">{t("o.links")}</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {linkTypes.map((k) => (
                        <div key={k}>
                          <label htmlFor={`l_${k}`} className="mb-1.5 block text-xs font-semibold text-white/55">
                            {t(`o.lt.${k}`)}
                          </label>
                          <input id={`l_${k}`} value={f[`l_${k}`] ?? ""} onChange={(e) => set(`l_${k}`, e.target.value)} maxLength={300} placeholder={LINK_PH[k]} dir="ltr" className={input} />
                        </div>
                      ))}
                    </div>
                    {errs.links && <p className="mt-2 text-xs font-semibold text-destructive">{errs.links}</p>}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl uppercase tracking-wide">{t("o.s3.t")}</h2>
                  <p className="mt-2 text-sm text-white/55">{t("o.s3.l")}</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="c_name" err={errs.c_name} opt={t("o.optional")} label={t("o.fullname")}>
                    {text("c_name", { maxLength: 80, autoComplete: "name" })}
                  </Field>
                  <Field id="c_phone" err={errs.c_phone} opt={t("o.optional")} label={t("o.phone")}>
                    {text("c_phone", { maxLength: 20, inputMode: "tel", autoComplete: "tel", placeholder: t("o.phone.ph"), dir: "ltr" })}
                  </Field>
                  <Field id="c_email" err={errs.c_email} opt={t("o.optional")} label={t("o.email")} optional>
                    {text("c_email", { maxLength: 120, type: "email", autoComplete: "email", dir: "ltr" })}
                  </Field>
                  <div>
                    <div className="mb-2 text-sm font-semibold text-white/80">{t("o.area")}</div>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup">
                      {["cairo", "giza", "other"].map((a) => (
                        <button
                          key={a}
                          type="button"
                          role="radio"
                          aria-checked={f.c_area === a}
                          onClick={() => set("c_area", a)}
                          className={cn("flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 py-2 text-sm font-semibold leading-tight transition", f.c_area === a ? "border-brand-purple bg-brand-purple/15" : "border-white/12 text-white/65")}
                        >
                          {t(`o.${a}`)}
                          <span className="mt-0.5 text-xs font-normal text-white/55">
                            {money(deliveryFee(config, a))} {cur}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Field id="c_address" err={errs.c_address} opt={t("o.optional")} label={t("o.address")}>
                  <textarea id="c_address" value={f.c_address ?? ""} onChange={(e) => set("c_address", e.target.value)} maxLength={300} rows={2} placeholder={t("o.address.ph")} aria-invalid={!!errs.c_address} autoComplete="street-address" className={cn(input, "h-auto py-3")} />
                </Field>
                <Field id="c_notes" err={errs.c_notes} opt={t("o.optional")} label={t("o.notes")} optional>
                  <textarea id="c_notes" value={f.c_notes ?? ""} onChange={(e) => set("c_notes", e.target.value)} maxLength={300} rows={2} placeholder={t("o.notes.ph")} className={cn(input, "h-auto py-3")} />
                </Field>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl uppercase tracking-wide">{t("o.s4.t")}</h2>
                  <p className="mt-2 text-sm text-white/55">{t("o.s4.l")}</p>
                </div>
                <dl className="divide-y divide-white/10 rounded-2xl border border-white/10 text-sm">
                  {[
                    [t("p.items"), cart.map(itemLabel).join("\n")],
                    [t("o.pname"), v("p_name")],
                    [t("o.print"), v("print_text")],
                    ...linkList().map(([k, x]) => [t(`o.lt.${k}`), x]),
                    [t("o.fullname"), v("c_name")],
                    [t("o.phone"), v("c_phone")],
                    [t("o.address"), `${t(`o.${v("c_area") || "cairo"}`)} · ${v("c_address")}`],
                  ].map(([a, b], i) => (
                    <div key={i} className="flex justify-between gap-4 px-4 py-3">
                      <dt className="text-white/50">{a}</dt>
                      <dd className="whitespace-pre-line text-end [overflow-wrap:anywhere]">{b}</dd>
                    </div>
                  ))}
                </dl>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 p-4">
                  <input type="checkbox" id="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-5 accent-[#8c52ff]" />
                  <span className="text-sm">{t("o.agree")}</span>
                </label>
                {errs.agree && <p className="-mt-3 text-xs font-semibold text-destructive">{errs.agree}</p>}
              </div>
            )}

            <div className="mt-10 flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => go(step - 1)} className={cn(step === 1 && "invisible")}>
                <ArrowLeft className="rtl:rotate-180" /> {t("o.back")}
              </Button>
              <Button type="submit" size="lg" className="hidden sm:inline-flex" disabled={busy || (step === 1 && cart.length === 0)}>
                <NfcWaves className="size-5" /> {busy ? t("o.placing") : step === 4 ? t("o.place") : t("o.next")}
              </Button>
            </div>
          </form>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-display text-sm uppercase tracking-wider">{t("o.sum")}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {cart.map((i) => (
                <li key={itemKey(i)} className="flex justify-between gap-3">
                  <span className="text-white/70">
                    {t(`prod.${i.product}`)} {planName(i)}
                    {i.extras?.length ? ` + ${i.extras.map((e) => t(`x.${e}`)).join(", ")}` : ""} × {i.qty}
                  </span>
                  <span className="whitespace-nowrap">{money(itemPrice(config, i) * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between text-white/60">
                <span>{t("o.sum.sub")}</span>
                <span>{money(cartTotal)}</span>
              </div>
              {disc && discount > 0 && cart.length > 0 && (
                <div className="flex justify-between text-brand-cyan">
                  <span>
                    {t("o.sum.disc")} (<span dir="ltr">{disc.code}</span>)
                  </span>
                  <span>−{money(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white/60">
                <span>{t("o.sum.delivery")}</span>
                <span>{money(cart.length ? delivery : 0)}</span>
              </div>
              <div className="flex justify-between pt-2 text-lg font-extrabold">
                <span>{t("o.sum.total")}</span>
                <span>
                  {money(cart.length ? total : 0)} {cur}
                </span>
              </div>
            </div>
            {cart.length > 0 && (
              <form
                className="mt-5 border-t border-white/10 pt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void applyCode(code);
                }}
              >
                <label htmlFor="coupon" className="text-sm text-white/60">{t("o.code")}</label>
                <div className="mt-2 flex gap-2">
                  <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} dir="ltr" autoComplete="off" className="h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-transparent px-4 text-sm uppercase outline-none focus:border-brand-cyan" />
                  {disc ? (
                    <button type="button" onClick={() => { setDisc(null); setCode(""); }} className="tap h-11 rounded-full border border-white/15 px-4 text-sm">{t("o.code.remove")}</button>
                  ) : (
                    <button type="submit" className="tap h-11 rounded-full border border-white/15 px-4 text-sm">{t("o.code.apply")}</button>
                  )}
                </div>
                {(codeErr || (disc && discount === 0)) && (
                  <p className="mt-2 text-xs text-red-300" role="alert">
                    {codeErr || t("o.code.min", { min: disc?.min ?? 0 })}
                  </p>
                )}
              </form>
            )}
          </div>
          <ul className="mt-4 space-y-3 px-2 text-sm text-white/55">
            <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-brand-cyan" /> {t("o.perk1")}</li>
            <li className="flex items-center gap-3"><Sparkles className="size-4 text-brand-cyan" /> {t("o.perk2")}</li>
            <li className="flex items-center gap-3"><Timer className="size-4 text-brand-cyan" /> {t("o.perk3")}</li>
          </ul>
        </aside>
      </div>

      {/* phone: total + continue always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/90 px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-3 pe-16">
          <div className="min-w-0">
            <div className="text-xs text-white/55">
              {t("o.total.mobile")} · {t(`o.step.${step}`)}
            </div>
            <div className="font-display text-lg">
              {money(cart.length ? total : 0)} <span className="text-xs text-white/60">{cur}</span>
            </div>
          </div>
          <Button type="submit" form="order-form" className="ms-auto" disabled={busy || (step === 1 && cart.length === 0)}>
            <NfcWaves className="size-4" /> {busy ? t("o.placing") : step === 4 ? t("o.place") : t("o.next")}
          </Button>
        </div>
      </div>
      <div className="h-20 sm:hidden" />
    </div>
  );
}
