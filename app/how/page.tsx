import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "How it works | RemoTap",
  description: "Order in 2 minutes, get your RemoTap card or stand in about a week. No app needed.",
};

export default function Page() {
  return <InfoPage page="how" />;
}
