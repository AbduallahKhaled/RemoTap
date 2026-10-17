import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header, Footer, WhatsAppFloat } from "@/components/site/chrome";
import { RevealObserver } from "@/components/site/reveal";

import siteConfig from "@/public/site-config.json";

/** Public address of the live site, set at build time by `npm run package -- --domain=...`. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "RemoTap | NFC cards & tap stands store, Egypt",
  description:
    "NFC business cards, stands, coasters and InstaPay / Vodafone Cash tap cards, made to order in Cairo and delivered all over Egypt. One tap opens your page, payment, WhatsApp and Google reviews.",
  openGraph: {
    title: "RemoTap | Tap. Connect. Grow.",
    description: "NFC cards, stands and payment tap cards, made in Cairo and delivered all over Egypt.",
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

// Offers for search engines come from the same price file the store reads, so they never go stale.
const OFFER_NAMES: Record<string, Record<string, string>> = {
  card: { basic: "RemoTap Card Basic", plus: "RemoTap Card Plus" },
  stand: { basic: "RemoTap Stand 10x15 cm", plus: "RemoTap Stand 15x20 cm" },
  coaster: { basic: "RemoTap Coaster 9x9 cm", plus: "RemoTap Coaster 12x12 cm" },
  instapay: { basic: "InstaPay Tap Card" },
  vfcash: { basic: "Vodafone Cash Tap Card" },
};
const offers = Object.entries(siteConfig.products as Record<string, Record<string, number>>).flatMap(([product, plans]) =>
  Object.entries(plans).map(([plan, price]) => ({
    "@type": "Offer",
    name: OFFER_NAMES[product]?.[plan] ?? `RemoTap ${product} ${plan}`,
    price,
    priceCurrency: "EGP",
  })),
);

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "RemoTap",
  url: SITE,
  image: `${SITE}/assets/img/og.jpg`,
  description: "NFC business cards, stands, coasters and payment tap cards, made to order in Cairo and delivered all over Egypt.",
  areaServed: "EG",
  currenciesAccepted: "EGP",
  paymentAccepted: "InstaPay, Vodafone Cash",
  makesOffer: offers,
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
