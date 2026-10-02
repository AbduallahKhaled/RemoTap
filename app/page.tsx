import HomeClient from "./home-client";
import PreviewApp from "./preview-app";

export default function Home() {
  return process.env.NEXT_PUBLIC_PREVIEW === "1" ? <PreviewApp /> : <HomeClient />;
}
