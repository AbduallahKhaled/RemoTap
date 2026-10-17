import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Pricing | RemoTap",
  description: "One price, no monthly bills. Card 200/400 EGP, stand 350/450 EGP, coaster 220/250 EGP, InstaPay and Vodafone Cash payment cards 150 EGP.",
};

export default function Page() {
  return <InfoPage page="pricing" />;
}
