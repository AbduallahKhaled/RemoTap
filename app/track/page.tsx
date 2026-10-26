import { Suspense } from "react";
import type { Metadata } from "next";
import TrackClient from "./track-client";

export const metadata: Metadata = {
  title: "Track your order | RemoTap",
  description: "See where your RemoTap order is: payment, printing, shipping and delivery.",
};

export default function TrackPage() {
  return (
    <Suspense>
      <TrackClient />
    </Suspense>
  );
}
