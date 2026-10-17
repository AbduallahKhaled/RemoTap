import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./shop-client";

export const metadata: Metadata = {
  title: "Shop | RemoTap NFC cards & stands",
  description: "RemoTap NFC cards, stands, stand coasters, coasters and InstaPay / Vodafone Cash payment cards. Made to order in Cairo & Giza.",
};

export default function ShopPage() {
  return (
    <Suspense>
      <ShopClient />
    </Suspense>
  );
}
