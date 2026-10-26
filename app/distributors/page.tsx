import type { Metadata } from "next";
import DistributorsClient from "./distributors-client";

export const metadata: Metadata = {
  title: "Become a distributor | RemoTap",
  description: "Sell RemoTap NFC cards and stands in your shop or to your clients at reseller prices. Delivery all over Egypt.",
};

export default function DistributorsPage() {
  return <DistributorsClient />;
}
