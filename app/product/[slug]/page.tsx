import { Suspense } from "react";
import type { Metadata } from "next";
import ProductClient from "./product-client";
import { PRODUCTS, type ProductKey } from "@/lib/store";

export function generateStaticParams() {
  return PRODUCTS.map((slug) => ({ slug }));
}

const META: Record<ProductKey, Metadata> = {
  card: {
    title: "RemoTap Card | NFC business card, Cairo",
    description: "Black NFC card that opens your page, WhatsApp, LinkedIn and Instagram with one tap. Basic 200 EGP, Plus 400 EGP.",
  },
  instapay: {
    title: "InstaPay Tap Card | RemoTap",
    description: "NFC tap card for shops: customers tap their phone and your InstaPay payment opens. 150 EGP, made in Cairo.",
  },
  vfcash: {
    title: "Vodafone Cash Tap Card | RemoTap",
    description: "NFC tap card for shops: customers tap their phone and your Vodafone Cash wallet opens. 150 EGP, made in Cairo.",
  },
  coaster: {
    title: "RemoTap Coaster | NFC table coaster, Cairo",
    description: "Square acrylic NFC coaster for cafés: one tap opens your menu, Instagram or Google reviews. 9×9 cm 220 EGP, 12×12 cm 250 EGP.",
  },
  stand: {
    title: "RemoTap Stand | InstaPay tap stand for shops",
    description: "Counter stand: customers tap to pay with InstaPay, follow you or leave a Google review. 10×15 cm 350 EGP, 15×20 cm 450 EGP.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return META[slug as ProductKey] ?? {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <ProductClient product={slug as ProductKey} />
    </Suspense>
  );
}
