import { Suspense } from "react";
import type { Metadata } from "next";
import ProductClient from "./product-client";
import type { ProductKey } from "@/lib/store";

export function generateStaticParams() {
  return [{ slug: "card" }, { slug: "stand" }, { slug: "instapay" }];
}

const META: Record<ProductKey, Metadata> = {
  card: {
    title: "RemoTap Card | NFC business card, Cairo",
    description: "Black NFC card that opens your page, WhatsApp, LinkedIn and Instagram with one tap. Basic 200 EGP, Plus 400 EGP.",
  },
  instapay: {
    title: "InstaPay Tap Card | RemoTap",
    description: "NFC tap card for shops: customers tap their phone and your InstaPay payment opens. 200 EGP, made in Cairo.",
  },
  stand: {
    title: "RemoTap Stand | InstaPay tap stand for shops",
    description: "Counter stand: customers tap to pay with InstaPay, follow you or leave a Google review. Basic 350 EGP, Plus 550 EGP.",
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
