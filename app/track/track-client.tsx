"use client";

import { useState } from "react";
import { Check, MessageCircle, PackageSearch } from "lucide-react";
import { useStore } from "@/components/providers";
import { PREVIEW, useNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  created: string;
  status: string;
  payment: string;
  total: number;
  items: { product: string; plan: string; qty: number }[];
  courier: string;
  tracking: string;
  dates: Record<string, string | null>;
};

const STEPS = ["placed", "paid", "printing", "shipped", "delivered"] as const;
const REACHED: Record<string, number> = { awaiting_payment: 0, paid: 1, printing: 2, shipped: 3, delivered: 4 };

export default function TrackClient() {
  const { t, money, cur, waLink, lang } = useStore();
  const { params } = useNav();
  const [id, setId] = useState(params.get("id") ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const date = (s?: string | null) => (s ? new Date(s).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" }) : "");

  async function look(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const q = new URLSearchParams({ id: id.trim().toUpperCase(), phone: phone.trim() });
      const r = await fetch(`${PREVIEW ? "" : "/"}api/track.php?${q}`);
      const j = await r.json();
      if (j?.ok) setRes(j);
      else {
        setRes(null);
        setErr(t(j?.error === "slow_down" ? "track.slow" : "track.nf"));
      }
    } catch {
      setErr(t("track.err"));
    }
    setBusy(false);
  }

  const input = "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30";
  const reached = res ? (REACHED[res.status] ?? 0) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">{t("track.title")}</h1>
      <p className="mt-3 text-white/60">{t("track.lead")}</p>

      <form onSubmit={look} className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="tr-id" className="mb-2 block text-sm font-semibold text-white/80">{t("track.id")}</label>
          <input id="tr-id" value={id} onChange={(e) => setId(e.target.value)} required dir="ltr" placeholder="RT-261017-AB12" className={cn(input, "uppercase")} />
        </div>
        <div>
          <label htmlFor="tr-phone" className="mb-2 block text-sm font-semibold text-white/80">{t("track.phone")}</label>
          <input id="tr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" className={input} />
        </div>
        <Button type="submit" size="lg" disabled={busy}>
          <PackageSearch /> {t("track.btn")}
        </Button>
      </form>
      {err && <p className="mt-4 text-sm text-red-300" role="alert">{err}</p>}

      {res && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-ink-2 p-6" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b className="font-mono" dir="ltr">{res.id}</b>
            <span className="text-sm text-white/60">
              {t("track.total")}: {money(res.total)} {cur}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/55">{res.items.map((i) => `${t(`prod.${i.product}`)} × ${i.qty}`).join(" · ")}</p>

          {res.status === "cancelled" ? (
            <p className="mt-6 text-white/75">{t("track.cancelled")}</p>
          ) : (
            <ol className="mt-6 space-y-4">
              {STEPS.map((s, n) => {
                const ok = n <= reached;
                const when = n === 0 ? res.created : res.dates[s];
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-sm", ok ? "border-transparent bg-brand-purple" : "border-white/15 text-white/30")}>
                      {ok ? <Check className="size-4" /> : n + 1}
                    </span>
                    <span className={ok ? "font-semibold" : "text-white/40"}>{t(`track.${s}`)}</span>
                    {ok && when && <span className="ms-auto text-sm text-white/45">{date(when)}</span>}
                  </li>
                );
              })}
            </ol>
          )}

          {res.status === "awaiting_payment" && ["awaiting", "sent", "rejected"].includes(res.payment) && (
            <p className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75">{t(`track.pay.${res.payment}`)}</p>
          )}
          {res.courier && (
            <p className="mt-6 text-sm text-white/75">
              {t("track.courier")}: <b>{res.courier}</b>
              {res.tracking && (
                <>
                  {" · "}
                  {t("track.tracking")}: <b dir="ltr">{res.tracking}</b>
                </>
              )}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-sm text-white/60">
            {t("track.help")}
            <Button asChild variant="whatsapp" size="sm">
              <a href={waLink(t("track.wamsg", { id: res.id }))} target="_blank" rel="noopener">
                <MessageCircle /> {t("track.wa")}
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
