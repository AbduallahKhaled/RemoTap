import type { Metadata } from "next";
import ShopClient from "./shop-client";

export const metadata: Metadata = {
  title: "Shop | RemoTap NFC cards & stands",
  description: "RemoTap NFC card and tap stand, Basic and Plus. Made to order in Cairo & Giza, pay with InstaPay.",
};

export default function ShopPage() {
  return <ShopClient />;
}
