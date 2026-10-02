import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Live demo | RemoTap",
  description: "See the page your customers open when they tap a RemoTap card or stand.",
};

export default function Page() {
  return <InfoPage page="demo" />;
}
