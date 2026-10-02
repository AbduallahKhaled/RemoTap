import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Why RemoTap | RemoTap",
  description: "Paper cards run out. A RemoTap tap doesn't. See how it compares.",
};

export default function Page() {
  return <InfoPage page="why" />;
}
