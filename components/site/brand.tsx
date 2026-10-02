import { cn } from "@/lib/utils";
import { asset } from "@/lib/nav";

/** REMO in white, T in purple, AP in blue, as on the brand board. */
export function Wordmark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span className={cn("font-display tracking-[0.14em] whitespace-nowrap", className)} dir="ltr">
      REMO
      <span className={mono ? "opacity-80" : "text-brand-purple"}>T</span>
      <span className={mono ? "opacity-70" : "text-brand-blue"}>AP</span>
    </span>
  );
}

/** The NFC "contactless" waves used on buttons and the product. */
export function NfcWaves({ className, strokeWidth = 4 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} aria-hidden>
      <path d="M18 17a10 10 0 0 1 0 14" />
      <path d="M25 11a18 18 0 0 1 0 26" />
      <path d="M32 5a26 26 0 0 1 0 38" />
      <circle cx="11" cy="24" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/assets/img/mark-64.png")} alt="" width={30} height={30} className="h-7 w-7" />
      <Wordmark className="text-[15px] sm:text-base" />
    </span>
  );
}
