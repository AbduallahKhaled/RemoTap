"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { asset } from "@/lib/nav";
import QRCode from "qrcode";
import { SHADERS_MAP, CARD_DESIGNS } from "@/components/ui/cards-shader-effect-utils/shaders-map";
import { NfcWaves, Wordmark } from "@/components/site/brand";
import { cn } from "@/lib/utils";

/*
 * 3D RemoTap NFC card with volumetric thickness, pointer tilt and a flip.
 * Adapted from the pasted CardsShader component:
 *  - brand shaders instead of the missing SHADERS_MAP utils file
 *  - RemoTap front (logo, NFC mark, printed name) and back (QR backup + page link)
 *  - mouse: hover flips, click changes the design (like the original)
 *  - touch: tap flips, dragging tilts, and it sways gently when idle
 */

export type CardsShaderProps = {
  /** Printed on the card. */
  name?: string;
  title?: string;
  /** Page slug shown on the back, e.g. "demo" -> remotap.com/p/demo */
  slug?: string;
  /** Controlled design index (0..8). Leave empty to let clicks shuffle it. */
  design?: number;
  onDesignChange?: (index: number) => void;
  /** Largest card width in px; the card also shrinks to fit its box. */
  maxWidth?: number;
  className?: string;
  /** Follow the pointer anywhere on the page (hero) or only over the card box. */
  trackWindow?: boolean;
  /** Flip state from outside (e.g. a "show back" button). */
  flipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  domain?: string;
};

export function CardsShader({
  name = "REMOTAP",
  title = "Tap. Connect. Grow.",
  slug = "demo",
  design,
  onDesignChange,
  maxWidth = 336,
  className,
  trackWindow = true,
  flipped,
  onFlipChange,
  domain = "remotap.com",
}: CardsShaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const frameId = useRef<number>(0);

  const isHoveredRef = useRef<boolean>(false);
  const tapFlipRef = useRef<boolean>(false);
  const [innerDesign, setInnerDesign] = useState<number>(0);
  const designIndex = design ?? innerDesign;

  const flipAngle = useRef<number>(0);
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, lastMove: 0 });
  const [coarse, setCoarse] = useState(false);
  const [metrics, setMetrics] = useState({ cardW: 336, cardH: 211 });
  const [qr, setQr] = useState<string>("");

  // External flip control
  useEffect(() => {
    if (flipped !== undefined) tapFlipRef.current = flipped;
  }, [flipped]);

  useEffect(() => {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://" + domain}/p/${slug}`;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#ffffff", light: "#00000000" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [slug, domain]);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const set = () => setCoarse(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // Pointer tilt
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fromWindow = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const ry = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      mouse.current.targetX = Math.max(-1, Math.min(1, rx));
      mouse.current.targetY = Math.max(-1, Math.min(1, ry));
      mouse.current.lastMove = performance.now();
    };
    const fromBox = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      mouse.current.targetX = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      mouse.current.targetY = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      mouse.current.lastMove = performance.now();
    };
    const reset = () => {
      mouse.current.targetX = 0;
      mouse.current.targetY = 0;
    };
    if (trackWindow) window.addEventListener("pointermove", fromWindow);
    root.addEventListener("pointermove", fromBox);
    root.addEventListener("pointerleave", reset);
    document.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("pointermove", fromWindow);
      root.removeEventListener("pointermove", fromBox);
      root.removeEventListener("pointerleave", reset);
      document.removeEventListener("mouseleave", reset);
    };
  }, [trackWindow]);

  // Size the card to its box
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      let cardW = Math.min(maxWidth, w * 0.82, h * 0.78 * 1.5925);
      cardW = Math.round(Math.max(150, cardW));
      setMetrics({ cardW, cardH: Math.round(cardW / 1.5925) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, [maxWidth]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const m = mouse.current;
      // Idle sway so the card feels alive on phones and when the mouse is still
      if (!reduce && now - m.lastMove > 2500) {
        m.targetX = Math.sin(now / 1800) * 0.45;
        m.targetY = Math.cos(now / 2300) * 0.3;
      }
      m.x += (m.targetX - m.x) * 0.08;
      m.y += (m.targetY - m.y) * 0.08;

      const card = cardRef.current;
      if (card) {
        const targetFlip = isHoveredRef.current || tapFlipRef.current ? 180 : 0;
        flipAngle.current += (targetFlip - flipAngle.current) * (reduce ? 1 : 0.1);
        const flipFactor = Math.cos((flipAngle.current * Math.PI) / 180);
        const rotX = -m.y * 12;
        const rotY = flipAngle.current + m.x * 15 * flipFactor;
        card.style.transform = `translateZ(60px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(-2deg)`;
        // moving highlight
        card.style.setProperty("--gx", `${50 + m.x * 40}%`);
        card.style.setProperty("--gy", `${50 + m.y * 40}%`);
      }
      frameId.current = requestAnimationFrame(tick);
    };
    frameId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId.current);
  }, []);

  const shuffleDesign = useCallback(() => {
    let next = Math.floor(Math.random() * SHADERS_MAP.length);
    while (next === designIndex) next = Math.floor(Math.random() * SHADERS_MAP.length);
    if (onDesignChange) onDesignChange(next);
    if (design === undefined) setInnerDesign(next);
  }, [designIndex, design, onDesignChange]);

  const toggleFlip = useCallback(() => {
    tapFlipRef.current = !tapFlipRef.current;
    onFlipChange?.(tapFlipRef.current);
  }, [onFlipChange]);

  const s = metrics.cardW / 336; // text scale
  const thicknessLayers = [-1.47, -0.73, 0, 0.73, 1.47];
  const ShaderComponent = SHADERS_MAP[designIndex % SHADERS_MAP.length];
  const light = CARD_DESIGNS[designIndex % CARD_DESIGNS.length].id === "chrome";
  const ink = light ? "text-[#0b0b1a]" : "text-white";
  const displayName = (name || "").trim() || "YOUR NAME";

  return (
    <div
      ref={rootRef}
      className={cn("absolute inset-0 flex items-center justify-center overflow-visible select-none", className)}
      style={{ perspective: "1350px", touchAction: "pan-y" }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={coarse ? "Flip the card" : "Flip the card. Click to change its design"}
        onClick={() => (coarse ? toggleFlip() : shuffleDesign())}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleFlip();
          }
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") isHoveredRef.current = true;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") isHoveredRef.current = false;
        }}
        className="relative cursor-pointer rounded-[16px] transition-transform duration-300 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-brand-blue"
        style={{ width: metrics.cardW, height: metrics.cardH, transformStyle: "preserve-3d" }}
      >
        {/* soft floor shadow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[22%] left-[8%] right-[8%] h-[22%] rounded-[50%] bg-brand-purple/35 blur-2xl"
          style={{ transform: "translateZ(-80px)" }}
        />
        <div
          ref={cardRef}
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d", backfaceVisibility: "visible" }}
        >
          {thicknessLayers.map((zOffset, layerIdx) => {
            const isFrontFace = layerIdx === thicknessLayers.length - 1;
            const isBackFace = layerIdx === 0;

            if (!isFrontFace && !isBackFace) {
              return (
                <div
                  key={layerIdx}
                  className="pointer-events-none absolute inset-0 rounded-[16px] border border-[#5d5d78]"
                  style={{ backgroundColor: "#4a4a63", transform: `translateZ(${zOffset}px)` }}
                />
              );
            }

            if (isFrontFace) {
              return (
                <div
                  key={layerIdx}
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px] border border-white/15"
                  style={{
                    transform: `translateZ(${zOffset}px)`,
                    backfaceVisibility: "hidden",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.15)",
                  }}
                >
                  <ShaderComponent />
                  <div
                    className="absolute inset-0 mix-blend-overlay"
                    style={{ background: "radial-gradient(60% 60% at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.35), transparent 70%)" }}
                  />
                  <div className={cn("absolute inset-0 z-10", ink)} style={{ padding: 22 * s }}>
                    <div className="flex items-start justify-between">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset("/assets/img/mark-128.png")}
                        alt=""
                        style={{ width: 38 * s, height: 38 * s, filter: light ? "none" : "drop-shadow(0 2px 8px rgba(0,0,0,.4))" }}
                      />
                      <span style={{ width: 30 * s, height: 30 * s }} className="block opacity-90">
                        <NfcWaves className="h-full w-full" strokeWidth={4.5} />
                      </span>
                    </div>
                    <div className="absolute" style={{ left: 22 * s, right: 22 * s, bottom: 20 * s }}>
                      <div className="font-display uppercase leading-tight tracking-[0.08em]" style={{ fontSize: 17 * s }} dir="auto">
                        {displayName}
                      </div>
                      {title ? (
                        <div className="mt-1 truncate opacity-75" style={{ fontSize: 10.5 * s }} dir="auto">
                          {title}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={layerIdx}
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px] border border-white/15"
                style={{
                  transform: `translateZ(${zOffset}px) rotateY(180deg)`,
                  backfaceVisibility: "hidden",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.15)",
                  background: "#07071a",
                }}
              >
                <div className="pointer-events-none absolute inset-0" style={{ filter: "blur(16px)", transform: "scale(1.15)" }}>
                  <ShaderComponent />
                </div>
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute inset-0 z-10 flex items-center text-white" style={{ padding: 20 * s, gap: 16 * s }}>
                  <div
                    className="shrink-0 rounded-[10px] bg-black/55 ring-1 ring-white/15"
                    style={{ width: metrics.cardH * 0.62, height: metrics.cardH * 0.62, padding: 8 * s }}
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 15 * s }}><Wordmark /></div>
                    <div className="mt-2 opacity-80" style={{ fontSize: 10 * s }}>
                      Tap or scan · المس أو امسح
                    </div>
                    <div className="mt-3 truncate font-mono opacity-95" style={{ fontSize: 11 * s }} dir="ltr">
                      {domain}/p/{slug}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CardsShader;
