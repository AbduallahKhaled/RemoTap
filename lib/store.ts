export type ProductKey = "card" | "stand" | "coaster" | "instapay" | "vfcash";
export const PRODUCTS: ProductKey[] = ["card", "stand", "coaster", "instapay", "vfcash"];
/** For cards: Basic/Plus. For products sold by size (stand, coaster): basic = small, plus = large. */
export type PlanKey = "basic" | "plus";

/** Paid add-ons on products sold by size, each at `extra_price`. */
export type ExtraKey = "design" | "page";
export const EXTRAS: ExtraKey[] = ["design", "page"];

/** Products sold by size: the plan picks the size. */
export const SIZES: Partial<Record<ProductKey, Record<PlanKey, string>>> = {
  stand: { basic: "10 × 15 cm", plus: "15 × 20 cm" },
  coaster: { basic: "9 × 9 cm", plus: "12 × 12 cm" },
};
export const isSized = (p: ProductKey) => SIZES[p] != null;

export type SiteConfig = {
  whatsapp: string;
  instapay_handle: string;
  instapay_number: string;
  instapay_link?: string;
  /** Delivery to Cairo and Giza. */
  delivery_fee: number;
  /** Delivery to every other governorate in Egypt. */
  delivery_fee_other?: number;
  plus_renewal_per_year: number;
  products: Partial<Record<ProductKey, Partial<Record<PlanKey, number>>>>;
  /** Home page rails: new arrivals and best sellers. */
  home?: { new?: RailItem[]; best?: RailItem[] };
  /** Price of each add-on (custom design, landing page) on stands and coasters. */
  extra_price?: number;
  max_quantity: number;
  domain?: string;
};

/** Used until /site-config.json loads, and if it can't. Same numbers as the file. */
export const FALLBACK_CONFIG: SiteConfig = {
  whatsapp: "201127209609",
  instapay_handle: "remotap@instapay",
  instapay_number: "01000000000",
  instapay_link: "",
  delivery_fee: 65,
  delivery_fee_other: 75,
  plus_renewal_per_year: 250,
  products: {
    card: { basic: 200, plus: 400 },
    stand: { basic: 350, plus: 450 },
    coaster: { basic: 220, plus: 250 },
    instapay: { basic: 150 },
    vfcash: { basic: 150 },
  },
  extra_price: 20,
  home: {
    new: [{ product: "coaster", plan: "plus" }, { product: "vfcash" }, { product: "instapay" }, { product: "stand", design: "remotap" }],
    best: [{ product: "card", plan: "plus" }, { product: "stand", design: "google" }, { product: "stand", design: "menu" }, { product: "stand", design: "instapay" }],
  },
  max_quantity: 20,
  domain: "remotap.com",
};

/** One product in a home page rail. */
export type RailItem = { product: ProductKey; plan?: PlanKey; design?: string };

export type CartItem = {
  product: ProductKey;
  plan: PlanKey;
  qty: number;
  /** Card look id (cards) or stand design id (stands). */
  design?: string;
  /** Paid add-ons (stands and coasters only). */
  extras?: ExtraKey[];
};

export const itemKey = (i: CartItem) => `${i.product}-${i.plan}-${i.design ?? ""}-${[...(i.extras ?? [])].sort().join("+")}`;

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
    basic: [["f.hardware.stand", true], ["f.onelink", true], ["f.edits", true]],
    plus: [["f.hardware.stand", true], ["f.onelink", true], ["f.edits", true]],
  },
  coaster: {
    basic: [["f.hardware.coaster", true], ["f.onelink", true], ["f.edits", true]],
    plus: [["f.hardware.coaster", true], ["f.onelink", true], ["f.edits", true]],
  },
  vfcash: {
    basic: [["f.hardware.vfcash", true], ["f.vfcash.direct", true], ["f.instapay.noapp", true], ["f.vfcash.change", true]],
    plus: [],
  },
};

/** Link fields shown in the order form, in order of usefulness per product. */
export const LINKS: Record<ProductKey, string[]> = {
  card: ["whatsapp", "linkedin", "resume", "instagram", "email", "website", "facebook", "tiktok", "instapay", "phone"],
  stand: ["instapay", "google", "vfcash", "whatsapp", "instagram", "facebook", "menu", "website", "tiktok", "phone"],
  coaster: ["instagram", "google", "menu", "instapay", "vfcash", "whatsapp", "facebook", "website", "tiktok", "phone"],
  instapay: ["instapay", "vfcash", "whatsapp", "google", "instagram", "menu", "website", "phone"],
  vfcash: ["vfcash", "instapay", "whatsapp", "google", "instagram", "menu", "website", "phone"],
};

/** Price of a product/plan from the config (0 if that plan doesn't exist). */
export const price = (c: SiteConfig, p: ProductKey, plan: PlanKey) => Number(c.products[p]?.[plan] ?? 0);

export const extraPrice = (c: SiteConfig) => Number(c.extra_price ?? 20);

/** Price of one piece of a cart line: base price plus its add-ons. */
export const itemPrice = (c: SiteConfig, i: Pick<CartItem, "product" | "plan" | "extras">) =>
  price(c, i.product, i.plan) + (isSized(i.product) ? (i.extras?.length ?? 0) * extraPrice(c) : 0);

/** Does this line come with a full page of links? Plus cards do; stands and coasters with the landing page add-on do. */
export const hasPage = (i: Pick<CartItem, "product" | "plan" | "extras">) =>
  isSized(i.product) ? !!i.extras?.includes("page") : i.plan === "plus";

/** "Basic"/"Plus" for cards, the size for stands and coasters. */
export const planLabel = (p: ProductKey, plan: PlanKey) => SIZES[p]?.[plan] ?? (plan === "plus" ? "Plus" : "Basic");

/** Delivery fee for an area: Cairo and Giza, or "other" for the rest of Egypt. */
export const deliveryFee = (c: SiteConfig, area?: string) =>
  Number(area === "other" ? (c.delivery_fee_other ?? c.delivery_fee) : c.delivery_fee) || 0;

/** Plans a product is sold in, cheapest first. The tap cards only have one. */
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

