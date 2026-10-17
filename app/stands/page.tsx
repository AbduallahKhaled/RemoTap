import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "../shop/shop-client";

export const metadata: Metadata = {
  title: "Stand coasters | RemoTap",
  description: "Ready acrylic stand coasters: Google review, Instagram, Facebook, InstaPay, Vodafone Cash and Menu. Fully customizable.",
};

/** Old /stands link: the stands now live in the shop, so this opens the shop on the stand coasters filter. */
export default function Page() {
  return (
    <Suspense>
      <ShopClient filter="stands" />
    </Suspense>
  );
}
