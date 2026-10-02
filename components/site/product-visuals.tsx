"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/nav";
import { CARD_DESIGNS } from "@/components/ui/cards-shader-effect-utils/shaders-map";
import { NfcWaves, Wordmark } from "@/components/site/brand";
import { useStore } from "@/components/providers";
import type { ProductKey } from "@/lib/store";
import { standStyle } from "@/lib/stands";
import { Star, Utensils, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/** Static mini card (CSS version of a design): for grids, cart rows and thumbnails. */
export function MiniCard({ design = "midnight", name, className, style }: { design?: string; name?: string; className?: string; style?: React.CSSProperties }) {
  const d = CARD_DESIGNS.find((x) => x.id === design) ?? CARD_DESIGNS[0];
  const light = d.id === "chrome";
  return (
    <div
      className={cn("@container relative aspect-[1.5925] overflow-hidden rounded-[7%/11%] border border-white/15 shadow-[0_30px_60px_-20px_rgba(0,0,0,.8)]", className)}
      style={{ background: d.css, ...style }}
    >
      <div className={cn("absolute inset-0 flex flex-col justify-between p-[7%]", light ? "text-ink" : "text-white")}>
        <div className="flex items-start justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/assets/img/mark-64.png")} alt="" className="w-[13%]" />
          <NfcWaves className="w-[10%]" />
        </div>
        {name !== undefined && (
          <div className="font-display text-[clamp(7px,5.2cqw,16px)] uppercase tracking-[0.08em]">
            {name}
          </div>
        )}
      </div>
    </div>
  );
}

/** Acrylic counter stand drawn in CSS 3D. */
/* Curved edge of the coloured panel, in a 100x100 box (scaled to the plate with mask-size). */
const PANEL_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M63 0H100V100H55C47 84 66 66 60 48C55 32 57 13 63 0Z"/></svg>',
)}")`;
const maskStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  maskImage: PANEL_MASK,
  WebkitMaskImage: PANEL_MASK,
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  ...extra,
});

/** Hand holding a phone to the chip: the "tap here" sign printed on every stand. */
function TapHand({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M40 9a14 14 0 0 1 9 9M44 3a21 21 0 0 1 13 14" />
      <rect x="20" y="10" width="20" height="34" rx="4" transform="rotate(-14 30 27)" />
      <path d="M25 17l8-2" transform="rotate(-14 30 27)" />
      <path d="M14 40c-3 2-4 6-1 9l7 8c2 2 5 3 8 3h8c4 0 7-3 7-7v-9c0-2-2-4-4-4" />
      <path d="M14 40l6-5c2-1 4 0 4 2l-3 5" />
      <path d="M30 60v-4" />
    </svg>
  );
}

function PanelIcon({ id }: { id: string }) {
  const box = "grid size-[15cqw] place-items-center rounded-full bg-white shadow-[0_1cqw_3cqw_rgba(0,0,0,.25)]";
  if (id === "instagram")
    return (
      <span className="grid size-[15cqw] place-items-center rounded-[4.5cqw] bg-[linear-gradient(45deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5)] shadow-[0_1cqw_3cqw_rgba(0,0,0,.2)]">
        <svg viewBox="0 0 24 24" className="size-[10cqw]" fill="none" stroke="#fff" strokeWidth={2.2} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="#fff" stroke="none" />
        </svg>
      </span>
    );
  if (id === "facebook")
    return <span className={cn(box, "font-sans text-[11cqw] font-black leading-none text-[#1877F2]")}>f</span>;
  if (id === "google")
    return (
      <span className={cn(box, "text-[#FBBC04]")}>
        <Star className="size-[8.5cqw]" fill="currentColor" strokeWidth={0} />
      </span>
    );
  if (id === "vfcash")
    return (
      <span className={cn(box, "text-[#E60000]")}>
        <Wallet className="size-[8.5cqw]" strokeWidth={2.2} />
      </span>
    );
  if (id === "menu")
    return (
      <span className={cn(box, "text-[#111]")}>
        <Utensils className="size-[8.5cqw]" strokeWidth={2.2} />
      </span>
    );
  if (id === "instapay")
    return (
      <span className={cn(box, "text-[#5B2BD6]")}>
        <NfcWaves className="size-[9cqw]" />
      </span>
    );
  return (
    <span className={cn(box, "bg-gradient-to-br from-brand-purple to-brand-blue text-white")}>
      <NfcWaves className="size-[9cqw]" />
    </span>
  );
}

/**
 * Flat, square acrylic tap stand (like the ones on shop counters):
 * white side with the tap sign and QR, coloured side with the design.
 * Sized by its container width; the printed text stays in English on every language.
 */
export function StandPlate({ design, className }: { design?: string; className?: string }) {
  const s = standStyle(design);
  return (
    <div className={cn("@container relative aspect-square select-none overflow-hidden rounded-[8%] bg-white text-[#141420]", className)} dir="ltr">
      {s.accent && <div className="absolute inset-0" style={maskStyle({ background: s.accent, transform: "translateX(-2.2cqw)" })} />}
      <div
        className={cn("absolute inset-0", s.clear && "backdrop-blur-sm")}
        style={maskStyle({ background: s.panel, boxShadow: s.clear ? "inset 0 0 0 1px rgba(0,0,0,.08)" : undefined })}
      />
      {/* white side */}
      <TapHand className="absolute left-[9%] top-[8%] w-[30%]" />
      <div className="absolute bottom-[8%] left-[9%] w-[29%] rounded-[2cqw] bg-white p-[1.2cqw] shadow-[0_0_0_0.6cqw_#f1f1f5]">
        <QrGlyph className="w-full text-[#141420]" />
      </div>
      <div className="absolute bottom-[8%] left-[41%] text-[2.6cqw] font-bold uppercase tracking-[0.12em] [writing-mode:vertical-rl]">Tap or scan</div>
      <div className="absolute left-[3.2%] top-1/2 -translate-y-1/2 text-[2cqw] tracking-wide text-[#141420]/55 [writing-mode:vertical-rl] rotate-180">
        powered by <b className="text-brand-purple">RemoTap</b>
      </div>
      {/* coloured side */}
      <div className="absolute left-[52%] top-[40%] -translate-x-1/2">
        <PanelIcon id={s.id} />
      </div>
      <div
        className="absolute bottom-[6%] right-[5%] top-[6%] flex items-center justify-center gap-[1.6cqw] whitespace-nowrap [writing-mode:vertical-rl]"
        style={{ color: s.ink }}
      >
        <span className="text-[2.7cqw] font-semibold uppercase tracking-[0.12em] opacity-85">{s.sub}</span>
        {s.id === "instapay" ? (
          <span className="text-[10cqw] font-black italic leading-none tracking-tight">
            Insta<span className="text-[#ffb4c8]">Pay</span>
          </span>
        ) : (
          <span className={cn("font-extrabold leading-[0.95]", s.title.length > 14 ? "text-[5.2cqw]" : s.title.length > 8 ? "text-[6.4cqw] uppercase tracking-wide" : "text-[9cqw] uppercase tracking-wide")}>{s.title}</span>
        )}
        {s.id === "google" && <span className="text-[3.6cqw] tracking-[0.2em] text-[#FBBC04]">★★★★★</span>}
      </div>
      {/* acrylic gloss */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(125deg,rgba(255,255,255,.55)_0%,rgba(255,255,255,0)_28%,rgba(255,255,255,0)_75%,rgba(255,255,255,.18)_100%)] mix-blend-soft-light" />
    </div>
  );
}

/** The stand in 3D: thick acrylic plate that follows the pointer (or sways on its own). */
export function StandVisual({ className, interactive = true, design }: { className?: string; interactive?: boolean; design?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return;
    const el = ref.current;
    const it = inner.current;
    if (!el || !it) return;
    let tx = 0,
      ty = 0,
      x = 0,
      y = 0,
      last = 0,
      raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      last = performance.now();
    };
    const tick = (now: number) => {
      if (now - last > 2500) {
        tx = Math.sin(now / 2000) * 0.5;
        ty = Math.cos(now / 2600) * 0.25;
      }
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      it.style.transform = `rotateX(${(10 - y * 10).toFixed(2)}deg) rotateY(${(-14 + x * 22).toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener("pointermove", move);
    raf = requestAnimationFrame(tick);
    return () => {
      el.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [interactive]);

  return (
    <div ref={ref} className={cn("relative grid place-items-center", className)} style={{ perspective: 1200 }}>
      <div ref={inner} className="relative aspect-square" style={{ transformStyle: "preserve-3d", transform: "rotateX(10deg) rotateY(-14deg)", width: "min(72%, 380px)" }}>
        <div className="absolute -inset-10 -z-10 rounded-full bg-brand-purple/25 blur-3xl" style={{ transform: "translateZ(-60px)" }} />
        {/* acrylic thickness */}
        {[-12, -9, -6, -3].map((z) => (
          <div key={z} className="absolute inset-0 rounded-[8%] border border-white/40 bg-white/25" style={{ transform: `translateZ(${z}px)` }} />
        ))}
        <StandPlate design={design} className="absolute inset-0 shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)]" />
        <div
          className="pointer-events-none absolute inset-0 rounded-[8%] border border-white/60"
          style={{ transform: "translateZ(2px)", background: "linear-gradient(125deg, rgba(255,255,255,.3) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,.12) 100%)" }}
        />
      </div>
    </div>
  );
}

function QrGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" className={className} fill="currentColor" aria-hidden>
      <path d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zm1 1v5h5V1zm1 1h3v3h-3zM0 14h7v7H0zm1 1v5h5v-5zm1 1h3v3H2zM9 0h2v2H9zm2 2h1v3h-1zM8 4h2v2H8zm1 4h3v1H9zm4 0h2v2h-2zm4 1h3v1h-3zM8 11h2v2H8zm3 1h2v1h-2zm3 0h1v3h-1zm2 2h3v2h-3zm-7 3h2v2H9zm4 0h1v4h-1zm2 2h2v2h-2zm4-2h2v4h-2z" />
    </svg>
  );
}

/** Thumbnail that picks the right visual for a product. */
export function ProductThumb({ product, design, className }: { product: ProductKey; design?: string; className?: string }) {
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-gradient-to-br from-[#16163a] to-ink-2", className)}>
      {product === "card" ? (
        <MiniCard design={design ?? "midnight"} className="w-[78%] -rotate-6" />
      ) : product === "instapay" ? (
        <MiniInstaPay className="h-[84%] rotate-6" />
      ) : (
        <StandPlate design={design} className="w-[72%] -rotate-3 shadow-[0_12px_30px_-10px_rgba(0,0,0,.8)]" />
      )}
    </div>
  );
}

/** Phone showing a RemoTap page, for the live demo section. */
export function PhoneMock({ className }: { className?: string }) {
  const { t } = useStore();
  const rows = [t("demo.phone.save"), t("demo.phone.resume"), "InstaPay", "WhatsApp", "Instagram"];
  return (
    <div className={cn("relative mx-auto aspect-[9/18.5] w-[260px] rounded-[42px] border border-white/15 bg-[#0b0b1e] p-3 shadow-[0_60px_120px_-30px_rgba(140,82,255,.55)]", className)}>
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className="relative h-full overflow-hidden rounded-[32px] bg-[radial-gradient(120%_50%_at_50%_0%,rgba(140,82,255,.35),transparent_60%),#05050f] px-5 pt-12">
        <div className="mx-auto grid size-16 place-items-center rounded-full border-2 border-brand-purple bg-ink p-3.5">{/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/assets/img/mark-64.png")} alt="" className="size-full object-contain" /></div>
        <div className="mt-3 text-center font-semibold">RemoTap</div>
        <div className="text-center text-[11px] text-white/50">Smart NFC cards &amp; stands · Cairo</div>
        <div className="mt-5 space-y-2.5">
          {rows.map((r) => (
            <div
              key={r}
              className="rt-box flex items-center gap-3 rounded-xl bg-[#0b0b26] px-3 py-2.5 text-[13px] font-semibold"
            >
              <span className="rt-chip size-5 rounded-md" />
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/*
 * InstaPay tap card: portrait, deep purple, in RemoTap style.
 * The words "InstaPay" are set as plain text (not InstaPay's logo artwork).
 * Mouse: hover flips. Touch: tap flips. It tilts with the pointer and sways when idle.
 */
export function InstaPayCard({
  name = "REMOTAP",
  handle = "remotap@instapay",
  className,
  interactive = true,
  flipped,
}: {
  name?: string;
  handle?: string;
  className?: string;
  interactive?: boolean;
  flipped?: boolean;
}) {
  const { t } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const flip = useRef(false);
  const hover = useRef(false);
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (flipped !== undefined) flip.current = flipped;
  }, [flipped]);

  useEffect(() => {
    import("qrcode").then((Q) =>
      Q.toString(`${location.origin}/p/demo`, { type: "svg", margin: 0, color: { dark: "#1c0647", light: "#00000000" } }).then(setQr).catch(() => {}),
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    const c = card.current;
    if (!el || !c) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tx = 0,
      ty = 0,
      x = 0,
      y = 0,
      a = 0,
      last = 0,
      raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      last = performance.now();
    };
    const tick = (now: number) => {
      if (!interactive || now - last > 2500) {
        tx = reduce ? 0 : Math.sin(now / 1900) * 0.5;
        ty = reduce ? 0 : Math.cos(now / 2400) * 0.3;
      }
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      const target = flip.current || hover.current ? 180 : 0;
      a += (target - a) * (reduce ? 1 : 0.1);
      const f = Math.cos((a * Math.PI) / 180);
      c.style.transform = `rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(a + x * 16 * f).toFixed(2)}deg) rotateZ(3deg)`;
      c.style.setProperty("--gx", `${50 + x * 40}%`);
      c.style.setProperty("--gy", `${50 + y * 40}%`);
      raf = requestAnimationFrame(tick);
    };
    if (interactive) el.addEventListener("pointermove", move);
    raf = requestAnimationFrame(tick);
    return () => {
      el.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [interactive]);

  const face = "absolute inset-0 overflow-hidden rounded-[7%/5%] border border-white/15 [backface-visibility:hidden]";
  return (
    <div ref={ref} className={cn("relative grid place-items-center", className)} style={{ perspective: 1200 }}>
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? t("prod.flip") : undefined}
        onClick={() => {
          if (interactive && matchMedia("(hover: none)").matches) flip.current = !flip.current;
        }}
        onKeyDown={(e) => {
          if (interactive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            flip.current = !flip.current;
          }
        }}
        onPointerEnter={(e) => {
          if (interactive && e.pointerType === "mouse") hover.current = true;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") hover.current = false;
        }}
        className={cn("relative outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan", interactive && "cursor-pointer")}
        style={{ height: "82%", maxHeight: 420, aspectRatio: "0.63" }}
      >
        <div aria-hidden className="pointer-events-none absolute -bottom-[10%] left-[10%] right-[10%] h-[14%] rounded-[50%] bg-[#6d28d9]/45 blur-2xl" />
        <div ref={card} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {/* edge */}
          <div className="absolute inset-0 rounded-[7%/5%] bg-[#2a0d5e]" style={{ transform: "translateZ(-1px)" }} />
          {/* front */}
          <div
            className={face}
            style={{
              transform: "translateZ(1px)",
              background:
                "radial-gradient(120% 70% at 100% 0%, rgba(140,82,255,.9), transparent 55%), radial-gradient(90% 60% at 0% 100%, rgba(55,118,255,.45), transparent 60%), linear-gradient(160deg, #5a1fb8, #3a0f86 60%, #2a0a66)",
            }}
          >
            <div className="absolute inset-0 mix-blend-overlay" style={{ background: "radial-gradient(60% 50% at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.4), transparent 70%)" }} />
            {/* NFC arcs */}
            <svg viewBox="0 0 100 100" className="absolute -right-[8%] -top-[4%] w-[62%] text-white/15" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
              <circle cx="80" cy="20" r="18" />
              <circle cx="80" cy="20" r="30" />
              <circle cx="80" cy="20" r="42" />
            </svg>
            <div className="@container relative flex h-full flex-col p-[9%] text-white">
              <NfcWaves className="ms-auto w-[22%] rotate-[-90deg] drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]" strokeWidth={4.5} />
              <div className="mt-auto text-center" dir="ltr">
                <div className="text-[8cqw] font-semibold opacity-85" dir="rtl">
                  ادفع بـ إنستاباي
                </div>
                <div className="mt-[2%] text-[15cqw] font-black italic leading-none tracking-tight" style={{ fontFamily: "Sora, Cairo, sans-serif" }}>
                  Insta<span className="text-[#ffb4c8]">Pay</span>
                </div>
                <div className="mt-[6%] text-[6.2cqw] font-semibold uppercase tracking-[0.18em] opacity-80">{t("ip.tap")}</div>
              </div>
              <div className="mt-auto flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display text-[7cqw] uppercase tracking-wide">{name}</div>
                  <div className="truncate font-mono text-[5cqw] opacity-70" dir="ltr">
                    {handle}
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset("/assets/img/mark-64.png")} alt="" className="w-[14%] shrink-0 brightness-0 invert" />
              </div>
            </div>
          </div>
          {/* back */}
          <div className={face} style={{ transform: "rotateY(180deg) translateZ(1px)", background: "linear-gradient(200deg, #4a1aa0, #2a0a66)" }}>
            <div className="@container flex h-full flex-col items-center justify-center gap-[5%] p-[10%] text-center text-white">
              <div className="w-[70%] rounded-[8%] bg-white p-[6%]" dangerouslySetInnerHTML={{ __html: qr }} />
              <div className="text-[8cqw] font-bold">{t("ip.scan")}</div>
              <div className="font-mono text-[5.5cqw] opacity-80" dir="ltr">
                {handle}
              </div>
              <div className="mt-[4%] text-[6cqw]">
                <Wordmark mono />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static small InstaPay card for thumbnails and cart rows. */
export function MiniInstaPay({ className }: { className?: string }) {
  return (
    <div
      className={cn("@container relative aspect-[0.63] overflow-hidden rounded-[7%/5%] border border-white/20 shadow-[0_20px_40px_-15px_rgba(0,0,0,.8)]", className)}
      style={{ background: "radial-gradient(120% 70% at 100% 0%, rgba(140,82,255,.9), transparent 55%), linear-gradient(160deg, #5a1fb8, #2a0a66)" }}
    >
      <div className="flex h-full flex-col p-[10%] text-white">
        <NfcWaves className="ms-auto w-[26%] -rotate-90" />
        <div className="mt-auto text-center text-[15cqw] font-black italic leading-none" dir="ltr" style={{ fontFamily: "Sora, sans-serif" }}>
          Insta<span className="text-[#ffb4c8]">Pay</span>
        </div>
        <div className="mt-auto" />
      </div>
    </div>
  );
}
