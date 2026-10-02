"use client";

/*
 * Navigation that works in two builds:
 *  - the real site (Next.js routes: /shop, /product/card, /order)
 *  - the preview build (NEXT_PUBLIC_PREVIEW=1): one page, views switched by #hash,
 *    so it runs from any folder with relative paths (used for the shareable preview link).
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react";

export const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "1";

/** Public file path: absolute on the real site, relative in the preview. */
export const asset = (p: string) => (PREVIEW ? p.replace(/^\//, "") : p);

const SECTIONS = ["shop"];
/** Detail pages that have their own URL (/how, /faq, ...). Keep in sync with INFO_PAGES. */
export const PAGES = ["stands", "how", "pricing", "demo", "for", "why", "faq"];

/** "/product/card?plan=plus" -> "#card-plus", "/#faq" -> "#faq" */
export function toHash(href: string) {
  if (href.startsWith("/p/")) return href.slice(1) + ".html";
  const [path, q = ""] = href.split("?");
  const sp = new URLSearchParams(q);
  const plan = sp.get("plan");
  const style = sp.get("style");
  if (path.startsWith("/#")) return path.slice(1);
  if (path === "/" || path === "") return "#home";
  if (path === "/shop") return "#store";
  if (path === "/order") return "#order";
  if (PAGES.includes(path.slice(1))) return "#" + path.slice(1);
  const m = path.match(/^\/product\/(card|stand|instapay)/);
  if (m) return `#${m[1]}${plan ? "-" + plan : ""}${plan && style ? "-" + style : ""}`;
  return "#home";
}

export type Route = { view: "home" | "shop" | "product" | "order" | "page"; page?: string; product?: "card" | "stand" | "instapay"; params: URLSearchParams; section?: string };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "");
  const params = new URLSearchParams();
  if (h === "store") return { view: "shop", params };
  if (h === "order") return { view: "order", params };
  if (PAGES.includes(h)) return { view: "page", page: h, params };
  const m = h.match(/^(card|stand|instapay)(?:-(basic|plus))?(?:-([a-z]+))?$/);
  if (m) {
    if (m[2]) params.set("plan", m[2]);
    if (m[3]) params.set("style", m[3]);
    return { view: "product", product: m[1] as "card" | "stand" | "instapay", params };
  }
  return { view: "home", params, section: SECTIONS.includes(h) ? h : undefined };
}

export const PreviewRouteCtx = createContext<Route>({ view: "home", params: new URLSearchParams() });

export function NavLink({ href, children, ...rest }: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (PREVIEW) {
    return (
      <a href={toHash(href)} {...rest}>
        {children}
      </a>
    );
  }
  if (href.startsWith("/p/")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}

/** Same shape in both builds: push/replace a path, read ?params. */
export function useNav() {
  const route = useContext(PreviewRouteCtx);
  // Hooks are always called; the preview ignores the Next ones.
  const router = useRouter();
  const sp = useSearchParams();
  if (PREVIEW) {
    return {
      params: route.params,
      push: (href: string) => {
        location.hash = toHash(href);
      },
      replace: (href: string) => {
        history.replaceState(null, "", toHash(href));
      },
    };
  }
  return {
    params: sp,
    push: (href: string) => router.push(href),
    replace: (href: string) => router.replace(href, { scroll: false }),
  };
}
