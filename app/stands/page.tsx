import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Stands | RemoTap",
  description: "Six ready acrylic tap stands: Google review, Instagram, Facebook, InstaPay, Vodafone Cash and Menu. Fully customizable, 350 EGP.",
};

export default function Page() {
  return <InfoPage page="stands" />;
}
