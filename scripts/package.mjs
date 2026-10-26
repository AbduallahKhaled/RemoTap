#!/usr/bin/env node
/**
 * Builds the site for upload to any PHP host with cPanel (Namecheap, Hostinger, ...).
 *
 *   npm run package -- --domain=yourdomain.com
 *
 * Output:
 *   dist/                 the Next.js static export + the PHP backend (orders, /p/ pages, admin)
 *   remotap-upload.zip    the same files, ready to upload to public_html and extract
 *
 * The build stops if the payment details in public/site-config.json are still placeholders,
 * because checkout shows them to customers as where to send money.
 * Pass --allow-placeholders only for a private test upload.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = (...p) => path.join(root, ...p);
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name) => process.argv.includes(`--${name}`);

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

// 1. Domain
const domain = (arg("domain") || process.env.SITE_DOMAIN || "")
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");
if (!domain) fail("Add your domain:  npm run package -- --domain=yourdomain.com");
const site = `https://${domain}`;

// 2. Payment and contact details must be real
const config = JSON.parse(fs.readFileSync(r("public", "site-config.json"), "utf8"));
const placeholders = [];
if (!config.whatsapp || /^20?10{8,}$/.test(config.whatsapp)) placeholders.push(`whatsapp: "${config.whatsapp}"`);
if (!config.instapay_number || /^0?10{8,}$/.test(config.instapay_number)) placeholders.push(`instapay_number: "${config.instapay_number}"`);
if (!config.instapay_handle || config.instapay_handle === "remotap@instapay") placeholders.push(`instapay_handle: "${config.instapay_handle}"`);
if (placeholders.length && !flag("allow-placeholders")) {
  fail(
    `public/site-config.json still has placeholder payment details:\n      ${placeholders.join("\n      ")}\n` +
      "    Customers would send money there. Put your real details in, then run this again.",
  );
}
if (placeholders.length) console.warn(`\n  ! Building with placeholder payment details (test upload only): ${placeholders.join(", ")}\n`);

// 3. Build the static site
console.log(`\n  Building for ${site} ...\n`);
execSync("npx next build", { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SITE_URL: site } });

// 4. Assemble dist = static export + PHP backend (dotfiles such as .htaccess included)
const dist = r("dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(r("out"), dist, { recursive: true });
fs.cpSync(r("backend"), dist, { recursive: true });
for (const f of ["_not-found", "_not-found.html", "_not-found.txt"]) fs.rmSync(path.join(dist, f), { recursive: true, force: true });
for (const d of ["data/orders", "data/taps", "data/profiles"]) fs.mkdirSync(path.join(dist, d), { recursive: true });

// 5. Point everything at the real domain
const distConfigPath = path.join(dist, "site-config.json");
const distConfig = JSON.parse(fs.readFileSync(distConfigPath, "utf8"));
distConfig.domain = domain;
fs.writeFileSync(distConfigPath, JSON.stringify(distConfig, null, 2) + "\n");

const phpConfig = path.join(dist, "private", "config.php");
fs.writeFileSync(phpConfig, fs.readFileSync(phpConfig, "utf8").replace(/'base_url'\s*=>\s*'[^']*'/, `'base_url' => '${site}'`));

const pages = ["", "shop", "pricing", "how", "demo", "for", "why", "faq", "services", "track", "distributors", ...Object.keys(config.products).map((p) => `product/${p}`)];
fs.writeFileSync(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((p) => `  <url><loc>${site}/${p}</loc></url>`).join("\n") +
    `\n</urlset>\n`,
);
fs.writeFileSync(
  path.join(dist, "robots.txt"),
  ["User-agent: *", "Disallow: /admin.php", "Disallow: /api/", "Disallow: /p/", "Disallow: /data/", "Disallow: /private/", "Disallow: /order", `Sitemap: ${site}/sitemap.xml`, ""].join("\n"),
);

// 6. Zip (bsdtar on Windows and macOS writes zip files)
const zip = r("remotap-upload.zip");
fs.rmSync(zip, { force: true });
// On Windows, use the system tar (bsdtar): Git's GNU tar may come first on PATH and cannot write zip.
const tar = process.platform === "win32" ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
try {
  execSync(`"${tar}" -a -c -f "${zip}" -C "${dist}" .`, { stdio: "ignore" });
  console.log(`\n  ✓ Ready: remotap-upload.zip (${(fs.statSync(zip).size / 1e6).toFixed(1)} MB) and dist/ for ${site}`);
} catch {
  console.log(`\n  ✓ Ready: dist/ for ${site}. Zip the contents of dist/ (including .htaccess files) to upload.`);
}
console.log("    Upload to public_html, extract, then open /admin.php right away to set the admin password.\n");
