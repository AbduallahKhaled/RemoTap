import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "FAQ | RemoTap",
  description: "Delivery, phones, payment, changes and more about RemoTap NFC cards and stands.",
};

export default function Page() {
  return <InfoPage page="faq" />;
}
