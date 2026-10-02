import { CARD_DESIGNS } from "@/components/ui/cards-shader-effect-utils/shaders-map";

/**
 * Square acrylic tap stands (NFC chip + QR). Each ready design opens one link,
 * so it sells as the Basic stand; every design is fully customizable (colours, text, logo).
 * The printed text stays in English, like the physical stands.
 */
export type StandStyle = {
  id: string;
  /** Link type the stand opens (preselected in the order form). */
  link: string;
  name: { en: string; ar: string };
  desc: { en: string; ar: string };
  /** Printed on the coloured panel. */
  title: string;
  sub: string;
  /** Coloured panel background and text colour. */
  panel: string;
  ink: string;
  /** Clear acrylic panel (Instagram style). */
  clear?: boolean;
  /** Thin line along the panel's curve. */
  accent?: string;
};

export const STAND_STYLES: StandStyle[] = [
  {
    id: "remotap",
    link: "instapay",
    name: { en: "RemoTap all-in-one", ar: "RemoTap الشامل" },
    desc: {
      en: "Our own look. With Plus it opens a page with every link: pay, review, follow and chat.",
      ar: "تصميمنا. مع Plus بيفتح صفحة فيها كل لينكاتك: دفع، تقييم، متابعة وشات.",
    },
    title: "Tap to connect",
    sub: "Pay · Review · Follow",
    panel: "linear-gradient(160deg,#8C52FF 0%,#3776FF 100%)",
    ink: "#fff",
  },
  {
    id: "google",
    link: "google",
    name: { en: "Google review stand", ar: "ستاند تقييم جوجل" },
    desc: {
      en: "Customers tap and your Google review page opens with the stars ready. More 5-star reviews, no searching for your shop.",
      ar: "العميل يلمس وتفتح صفحة تقييمك على جوجل والنجوم جاهزة. تقييمات ٥ نجوم أكتر من غير ما يدوّر على محلك.",
    },
    title: "Review us on Google",
    sub: "We'd appreciate your review!",
    panel: "linear-gradient(160deg,#2563EB 0%,#1741B8 100%)",
    ink: "#fff",
  },
  {
    id: "instagram",
    link: "instagram",
    name: { en: "Instagram stand", ar: "ستاند إنستجرام" },
    desc: {
      en: "One tap opens your Instagram profile so customers follow you before they leave the counter.",
      ar: "لمسة واحدة تفتح بروفايلك على إنستجرام، فالعميل يتابعك قبل ما يمشي من الكاشير.",
    },
    title: "Follow us on Instagram",
    sub: "Tap to follow",
    panel: "linear-gradient(160deg,rgba(255,255,255,.55),rgba(235,235,245,.35))",
    ink: "#1d1d2b",
    clear: true,
  },
  {
    id: "facebook",
    link: "facebook",
    name: { en: "Facebook stand", ar: "ستاند فيسبوك" },
    desc: {
      en: "Opens your Facebook page in one tap: more likes and followers from people already in your shop.",
      ar: "بيفتح صفحتك على فيسبوك بلمسة: لايكات ومتابعين أكتر من الناس اللي في محلك أصلًا.",
    },
    title: "Follow us on Facebook",
    sub: "Like · Follow · Share",
    panel: "linear-gradient(160deg,#2F7BF5 0%,#1455C9 100%)",
    ink: "#fff",
  },
  {
    id: "instapay",
    link: "instapay",
    name: { en: "InstaPay stand", ar: "ستاند إنستاباي" },
    desc: {
      en: "Customers tap and your InstaPay payment opens. No reading your number out loud, no wrong transfers.",
      ar: "العميل يلمس ويفتحله الدفع على إنستاباي. من غير ما تملي رقمك ومن غير تحويلات غلط.",
    },
    title: "InstaPay",
    sub: "Tap to pay",
    panel: "linear-gradient(160deg,#5B2BD6 0%,#3A1796 100%)",
    ink: "#fff",
  },
  {
    id: "vfcash",
    link: "vfcash",
    name: { en: "Vodafone Cash stand", ar: "ستاند فودافون كاش" },
    desc: {
      en: "Shows your Vodafone Cash wallet number with a copy button, so customers send the right amount to the right number.",
      ar: "بيعرض رقم محفظة فودافون كاش بتاعتك بزرار نسخ، فالعميل يحوّل على الرقم الصح.",
    },
    title: "Vodafone Cash",
    sub: "Pay by wallet",
    panel: "linear-gradient(160deg,#1a1a1a 0%,#000 100%)",
    ink: "#fff",
    accent: "#E60000",
  },
  {
    id: "menu",
    link: "menu",
    name: { en: "Menu stand", ar: "ستاند المنيو" },
    desc: {
      en: "For cafés and restaurants: one tap on the table opens your menu or online ordering link.",
      ar: "للكافيهات والمطاعم: لمسة على الترابيزة تفتح المنيو أو لينك الطلب أونلاين.",
    },
    title: "Menu",
    sub: "Scan to order online",
    panel: "linear-gradient(160deg,#1c1c22 0%,#050507 100%)",
    ink: "#fff",
  },
];

/** The six ready designs sold as their own products (all but the RemoTap look). */
export const READY_STANDS = STAND_STYLES.filter((s) => s.id !== "remotap");

export const standStyle = (id?: string) => STAND_STYLES.find((s) => s.id === id) ?? STAND_STYLES[0];

/** Name of the chosen look (card design or stand design), or "" if none. */
export function lookName(product: string, design: string | undefined, lang: "en" | "ar") {
  if (!design) return "";
  if (product === "card") return CARD_DESIGNS.find((d) => d.id === design)?.name[lang] ?? "";
  if (product === "stand") return STAND_STYLES.find((s) => s.id === design)?.name[lang] ?? "";
  return "";
}
