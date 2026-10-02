"use client";

import { Suspense, useEffect, useState } from "react";
import HomeClient from "./home-client";
import ShopClient from "./shop/shop-client";
import ProductClient from "./product/[slug]/product-client";
import OrderClient from "./order/order-client";
import { parseHash, PreviewRouteCtx, type Route } from "@/lib/nav";
import { scanReveal } from "@/components/site/reveal";

/** Preview build only: the whole store on one page, views switched by #hash. */
export default function PreviewApp() {
  const [route, setRoute] = useState<Route>({ view: "home", params: new URLSearchParams() });
  const [n, setN] = useState(0);

  useEffect(() => {
    let prevView = "";
    const on = () => {
      const r = parseHash(location.hash);
      setRoute(r);
      setN((x) => x + 1);
      const changed = prevView !== r.view + (r.product ?? "");
      prevView = r.view + (r.product ?? "");
      requestAnimationFrame(() =>
        setTimeout(() => {
          if (r.section) document.getElementById(r.section)?.scrollIntoView({ behavior: changed ? "auto" : "smooth" });
          else if (changed) window.scrollTo({ top: 0 });
          scanReveal();
        }, 30),
      );
    };
    on();
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  return (
    <PreviewRouteCtx.Provider value={route}>
      <Suspense>
        {route.view === "home" && <HomeClient />}
        {route.view === "shop" && <ShopClient />}
        {route.view === "product" && route.product && <ProductClient key={route.product + n} product={route.product} />}
        {route.view === "order" && <OrderClient />}
      </Suspense>
    </PreviewRouteCtx.Provider>
  );
}
