import type { NextConfig } from "next";

// Static export: `npm run build` writes plain HTML/CSS/JS to /out, which is
// uploaded to Hostinger next to the PHP files (orders, /p/ pages, admin).
// `npm run build:preview` makes the one-page preview (relative paths) in /out-preview.
const preview = process.env.NEXT_PUBLIC_PREVIEW === "1";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  ...(preview ? { distDir: "out-preview", assetPrefix: "." } : {}),
};

export default nextConfig;
