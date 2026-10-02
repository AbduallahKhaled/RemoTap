import type { Metadata } from "next";
import InfoPage from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "Who it's for | RemoTap",
  description: "RemoTap stands for shops and caf\u00e9s, RemoTap cards for students and professionals.",
};

export default function Page() {
  return <InfoPage page="for" />;
}
