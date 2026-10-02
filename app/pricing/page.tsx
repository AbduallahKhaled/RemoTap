import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Pricing | RemoTap",
  description: "Basic or Plus, one price, no monthly bills. Card 200/400 EGP, stand 350/550 EGP.",
};

export default function Page() {
  return <InfoPage page="pricing" />;
}
