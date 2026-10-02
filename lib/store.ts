export type ProductKey = "card" | "stand" | "instapay";
export const PRODUCTS: ProductKey[] = ["card", "stand", "instapay"];
export type PlanKey = "basic" | "plus";

export type SiteConfig = {
  whatsapp: string;
  instapay_handle: string;
  instapay_number: string;
  instapay_link?: string;
  delivery_fee: number;
  plus_renewal_per_year: number;
  products: Record<ProductKey, Partial<Record<PlanKey, number>>>;
  max_quantity: number;
  domain?: string;
};

/** Used until /site-config.json loads, and if it can't. Same numbers as the file. */
export const FALLBACK_CONFIG: SiteConfig = {
  whatsapp: "201000000000",
  instapay_handle: "remotap@instapay",
  instapay_number: "01000000000",
  instapay_link: "",
  delivery_fee: 60,
  plus_renewal_per_year: 250,
  products: { card: { basic: 200, plus: 400 }, stand: { basic: 350, plus: 550 }, instapay: { basic: 200 } },
  max_quantity: 20,
  domain: "remotap.com",
};

export type CartItem = {
  product: ProductKey;
  plan: PlanKey;
  qty: number;
  /** Card look id (cards only). */
  design?: string;
};

export const itemKey = (i: CartItem) => `${i.product}-${i.plan}-${i.design ?? ""}`;

/** Features per product and plan: [dictionary key, included?] */
export const FEATURES: Record<ProductKey, Record<PlanKey, [string, boolean][]>> = {
  card: {
    basic: [["f.hardware.card", true], ["f.onelink", true], ["f.page", false], ["f.save", false], ["f.edits", false], ["f.taps", false]],
    plus: [["f.hardware.card", true], ["f.page", true], ["f.alllinks", true], ["f.save", true], ["f.edits", true], ["f.taps", true]],
  },
  instapay: {
    basic: [["f.hardware.instapay", true], ["f.instapay.direct", true], ["f.instapay.noapp", true], ["f.instapay.change", true]],
    plus: [],
  },
  stand: {
    basic: [["f.hardware.stand", true], ["f.onelink", true], ["f.page", false], ["f.alllinks", false], ["f.edits", false], ["f.taps", false]],
    plus: [["f.hardware.stand", true], ["f.page", true], ["f.alllinks", true], ["f.edits", true], ["f.taps", true]],
  },
};

/** Link fields shown in the order form, in order of usefulness per product. */
export const LINKS: Record<ProductKey, string[]> = {
  card: ["whatsapp", "linkedin", "resume", "instagram", "email", "website", "facebook", "tiktok", "instapay", "phone"],
  stand: ["instapay", "google", "vfcash", "whatsapp", "instagram", "facebook", "menu", "website", "tiktok", "phone"],
  instapay: ["instapay", "vfcash", "whatsapp", "google", "instagram", "menu", "website", "phone"],
};

/** Price of a product/plan from the config (0 if that plan doesn't exist). */
export const price = (c: SiteConfig, p: ProductKey, plan: PlanKey) => Number(c.products[p]?.[plan] ?? 0);

/** Plans a product is sold in, cheapest first. The InstaPay card only has one. */
export const plansFor = (c: SiteConfig, p: ProductKey): PlanKey[] =>
  (["basic", "plus"] as PlanKey[]).filter((pl) => c.products[p]?.[pl] != null);

export const LINK_PH: Record<string, string> = {
  instapay: "yourname@instapay",
  vfcash: "010XXXXXXXX (wallet number)",
  resume: "Link to your CV (Google Drive, PDF, LinkedIn…)",
  whatsapp: "01XXXXXXXXX",
  instagram: "@username",
  linkedin: "linkedin.com/in/…",
  facebook: "facebook.com/…",
  tiktok: "@username",
  google: "Google Maps review link",
  website: "https://…",
  menu: "Menu link",
  email: "name@email.com",
  phone: "01XXXXXXXXX",
};

