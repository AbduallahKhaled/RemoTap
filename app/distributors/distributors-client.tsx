"use client";

import { useState } from "react";
import { BadgePercent, Check, Printer, Send, Truck } from "lucide-react";
import { useStore } from "@/components/providers";
import { PREVIEW } from "@/lib/nav";
import { Button } from "@/components/ui/button";

const PHONE_RE = /^(\+?20|0)?1[0125]\d{8}$/;
const KINDS = ["phone", "print", "agency", "other"] as const;
const VOLUMES = ["1-20", "20-50", "50-200", "200+"];

export default function DistributorsClient() {
  const { t, waLink } = useStore();
  const [f, setF] = useState<Record<string, string>>({ kind: DIST_KIND_EN.phone, volume: "1-20" });
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [phoneErr, setPhoneErr] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((c) => ({ ...c, [k]: e.target.value }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!PHONE_RE.test((f.phone ?? "").replace(/[\s-]/g, ""))) {
      setPhoneErr(t("o.badphone"));
      return;
    }
    setPhoneErr("");
    setState("busy");
    const fd = new FormData();
    // The kind goes in English words so the admin always reads the same labels.
    Object.entries(f).forEach(([k, v]) => fd.set(k, v));
    fd.set("website_hp", (document.getElementById("d_hp") as HTMLInputElement)?.value ?? "");
    try {
      const r = await fetch(PREVIEW ? "api/distributor.php" : "/api/distributor.php", { method: "POST", body: fd });
      const j = await r.json();
      setState(j?.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  const input = "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30";
  const label = "mb-2 block text-sm font-semibold text-white/80";
  const perks = [
    [BadgePercent, "dist.p1"],
    [Printer, "dist.p2"],
    [Truck, "dist.p3"],
  ] as const;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl">{t("dist.title")}</h1>
        <p className="mt-4 text-white/60">{t("dist.lead")}</p>
        <ul className="mt-8 space-y-4">
          {perks.map(([Icon, k]) => (
            <li key={k} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-brand-purple/20 text-brand-cyan">
                <Icon className="size-5" />
              </span>
              {t(k)}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        {state === "sent" ? (
          <p className="flex items-start gap-3 text-white/85" role="status">
            <Check className="mt-0.5 size-5 shrink-0 text-brand-cyan" /> {t("dist.ok")}
          </p>
        ) : (
          <form onSubmit={send} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="d-name" className={label}>{t("dist.name")}</label>
              <input id="d-name" required maxLength={80} value={f.name ?? ""} onChange={set("name")} className={input} />
            </div>
            <div>
              <label htmlFor="d-company" className={label}>{t("dist.company")}</label>
              <input id="d-company" maxLength={100} value={f.company ?? ""} onChange={set("company")} className={input} />
            </div>
            <div>
              <label htmlFor="d-phone" className={label}>{t("dist.phone")}</label>
              <input id="d-phone" required inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" value={f.phone ?? ""} onChange={set("phone")} aria-invalid={!!phoneErr} className={input} />
              {phoneErr && <p className="mt-1.5 text-xs font-semibold text-destructive">{phoneErr}</p>}
            </div>
            <div>
              <label htmlFor="d-email" className={label}>{t("dist.email")}</label>
              <input id="d-email" type="email" dir="ltr" maxLength={120} value={f.email ?? ""} onChange={set("email")} className={input} />
            </div>
            <div>
              <label htmlFor="d-city" className={label}>{t("dist.city")}</label>
              <input id="d-city" maxLength={60} value={f.city ?? ""} onChange={set("city")} className={input} />
            </div>
            <div>
              <label htmlFor="d-kind" className={label}>{t("dist.kind")}</label>
              <select id="d-kind" value={f.kind} onChange={set("kind")} className={input}>
                {KINDS.map((k) => (
                  <option key={k} value={DIST_KIND_EN[k]} className="bg-ink">{t(`dist.k.${k}`)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="d-volume" className={label}>{t("dist.volume")}</label>
              <select id="d-volume" value={f.volume} onChange={set("volume")} className={input}>
                {VOLUMES.map((v) => (
                  <option key={v} value={v} className="bg-ink">{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="d-msg" className={label}>{t("dist.msg")}</label>
              <textarea id="d-msg" rows={3} maxLength={600} value={f.message ?? ""} onChange={set("message")} className={`${input} h-auto py-3`} />
            </div>
            <input id="d_hp" name="website_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" className="w-full" disabled={state === "busy"}>
                <Send /> {t("dist.btn")}
              </Button>
              {state === "error" && (
                <p className="mt-3 text-sm text-red-300" role="alert">
                  {t("dist.err")}{" "}
                  <a className="underline" href={waLink(t("dist.title"))} target="_blank" rel="noopener">WhatsApp</a>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const DIST_KIND_EN: Record<(typeof KINDS)[number], string> = {
  phone: "Phone & accessories shop",
  print: "Printing or gifts shop",
  agency: "Marketing agency",
  other: "Other",
};
