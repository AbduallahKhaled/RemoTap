import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header, Footer, WhatsAppFloat } from "@/components/site/chrome";
import { RevealObserver } from "@/components/site/reveal";

const SITE = "https://remotap.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "RemoTap | NFC cards & tap stands store, Cairo",
  description:
    "NFC business cards and InstaPay tap stands made to order in Cairo & Giza. One tap opens your page, InstaPay, WhatsApp and Google reviews. From 200 EGP.",
  openGraph: {
    title: "RemoTap | Tap. Connect. Grow.",
    description: "NFC cards & stands made to order in Cairo & Giza. From 200 EGP, pay with InstaPay.",
    url: SITE,
    siteName: "RemoTap",
    images: [{ url: "/assets/img/og.jpg", width: 1200, height: 630 }],
    locale: "en_EG",
    alternateLocale: ["ar_EG"],
    type: "website",
  },
  icons: {
    icon: "/assets/img/favicon-48.png",
    apple: "/assets/img/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = { themeColor: "#00000E", width: "device-width", initialScale: 1 };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "RemoTap",
  url: SITE,
  image: `${SITE}/assets/img/og.jpg`,
  description: "NFC business cards and tap stands, made to order in Cairo & Giza.",
  areaServed: ["Cairo", "Giza"],
  currenciesAccepted: "EGP",
  paymentAccepted: "InstaPay",
  makesOffer: [
    { "@type": "Offer", name: "RemoTap Card Basic", price: 200, priceCurrency: "EGP" },
    { "@type": "Offer", name: "RemoTap Card Plus", price: 400, priceCurrency: "EGP" },
    { "@type": "Offer", name: "RemoTap Stand Basic", price: 350, priceCurrency: "EGP" },
    { "@type": "Offer", name: "RemoTap Stand Plus", price: 550, priceCurrency: "EGP" },
    { "@type": "Offer", name: "RemoTap InstaPay Tap Card", price: 200, priceCurrency: "EGP" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Michroma&family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppFloat />
          <RevealObserver />
        </Providers>
      </body>
    </html>
  );
}
