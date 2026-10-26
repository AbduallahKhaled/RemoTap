"use client";

import { useEffect, useState } from "react";
import { Check, Send, Star } from "lucide-react";
import { useStore } from "@/components/providers";
import { PREVIEW } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Review = { name: string; role: string; rating: number; text: string; product: string };
const API = PREVIEW ? "api/reviews.php" : "/api/reviews.php";

/** Home page reviews: approved reviews from the admin, plus a form to leave one (it waits for approval). */
export function Reviews() {
  const { t } = useStore();
  const [list, setList] = useState<Review[]>([]);

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((j) => setList(Array.isArray(j?.reviews) ? j.reviews : []))
      .catch(() => {});
  }, []);

  return (
    <section id="reviews" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
      {/* Plain heading, not SectionHead: its scroll reveal is set up before these reviews load, so it would stay hidden. */}
      <h2 className="mb-10 max-w-3xl font-display text-3xl uppercase leading-[1.08] tracking-wide sm:text-5xl">{t(list.length ? "rev.title" : "rev.leave")}</h2>
      <div className={cn("grid gap-4", list.length && "lg:grid-cols-[2fr_1fr]")}>
        {list.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((r, i) => (
              <figure key={i} className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <Stars n={r.rating} />
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-white/80">{r.text}</blockquote>
                <figcaption className="mt-5 text-sm">
                  <b>{r.name}</b>
                  {r.role && <span className="text-white/50"> · {r.role}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <LeaveReview wide={!list.length} />
      </div>
    </section>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} / 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={s <= n ? "size-4 fill-brand-cyan text-brand-cyan" : "size-4 text-white/20"} />
      ))}
    </div>
  );
}

function LeaveReview({ wide }: { wide: boolean }) {
  const { t } = useStore();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [f, setF] = useState({ name: "", role: "", text: "" });
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const input = "h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-sm outline-none transition placeholder:text-white/30 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const fd = new FormData();
    fd.set("rating", String(rating));
    Object.entries(f).forEach(([k, v]) => fd.set(k, v));
    fd.set("website_hp", (document.getElementById("rv_hp") as HTMLInputElement)?.value ?? "");
    try {
      const r = await fetch(API, { method: "POST", body: fd });
      const j = await r.json();
      setState(j?.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={cn("self-start rounded-3xl border border-white/10 bg-ink-2 p-6", wide && "max-w-xl")}>
      {state === "sent" ? (
        <p className="flex items-start gap-3 text-white/85" role="status">
          <Check className="mt-0.5 size-5 shrink-0 text-brand-cyan" /> {t("rev.ok")}
        </p>
      ) : (
        <form onSubmit={send}>
          {!wide && <h3 className="font-display text-lg uppercase tracking-wide">{t("rev.leave")}</h3>}
          <p className={cn("text-sm text-white/60", !wide && "mt-1")}>{t("rev.leave.lead")}</p>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold text-white/80">{t("rev.rate")}</legend>
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={t("rev.star", { n })}
                  aria-pressed={rating === n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  className="tap rounded-lg p-1"
                >
                  <Star className={cn("size-7 transition", n <= (hover || rating) ? "fill-brand-cyan text-brand-cyan" : "text-white/25")} />
                </button>
              ))}
            </div>
          </fieldset>
          {/* The rest opens after a star is picked, so the box stays small on the home page. */}
          {rating > 0 && (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t("rev.name")} aria-label={t("rev.name")} className={input} />
                <input maxLength={80} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder={t("rev.role")} aria-label={t("rev.role")} className={input} />
              </div>
              <textarea required minLength={5} maxLength={600} rows={3} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder={t("rev.text.ph")} aria-label={t("rev.text")} className={cn(input, "h-auto py-3")} />
              <input id="rv_hp" name="website_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <Button type="submit" disabled={state === "busy"}>
                <Send /> {t("rev.send")}
              </Button>
              {state === "error" && <p className="text-xs text-red-300" role="alert">{t("rev.err")}</p>}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
