import { Suspense } from "react";
import type { Metadata } from "next";
import OrderClient from "./order-client";

export const metadata: Metadata = {
  title: "Checkout | RemoTap",
  description: "Order your RemoTap NFC card or stand and pay with InstaPay.",
};

export default function OrderPage() {
  return (
    <Suspense>
      <OrderClient />
    </Suspense>
  );
}
