import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Extra services | RemoTap",
  description: "Review filter, custom landing page with Google Analytics, and custom websites. Message us on WhatsApp to start.",
};

export default function Page() {
  return <InfoPage page="services" />;
}
