# RemoTap store: how to put it live on Hostinger

`remotap-store-upload.zip` is the whole website, ready to upload. It replaces the first site (same PHP order system, admin and customer pages, new store front). No database needed.

## 1. Upload (about 10 minutes)

1. hPanel → **Websites** → your site → **File Manager** → open `public_html`.
2. If the first RemoTap site is already there: **download a copy of the `data` folder first** (it holds your orders, customer pages and admin password). Then delete everything else in `public_html`.
3. Upload `remotap-store-upload.zip` into `public_html` → right-click → **Extract**. `index.html`, `.htaccess` and the `_next` folder must end up directly in `public_html`.
4. If you had a `data` folder from the first site, upload it back over the new one (it keeps every order and page).
5. hPanel → **Security → SSL** → install the free SSL.
6. hPanel → **Advanced → PHP Configuration** → PHP 8.1 or newer.

## 2. Fill in your details (5 minutes)

Edit `site-config.json` (WhatsApp number, InstaPay handle/number/link, delivery fee, prices) and `private/config.php` (`notify_email`, `base_url`). Same fields as before; the store reads them on every visit, so price changes need no rebuild.

## 3. Admin password

Open `https://YOUR-DOMAIN/admin.php` right after uploading and choose a password (skip this if you kept your old `data` folder).

## 4. What's where

| Address | What it is |
|---|---|
| `/` | Landing page with the 3D card (hover to flip on a computer, tap to flip on a phone) |
| `/shop` | All products, plus a "What do you need it for?" helper that recommends one |
| `/product/card`, `/product/stand`, `/product/instapay` | Product pages: plan, card look, quantity, add to cart |
| `/order` | Checkout in 4 named steps (Cart, Details, Delivery, Review) → InstaPay + WhatsApp. Earlier steps can be clicked to go back; on phones the total and Continue stay pinned at the bottom |
| `/p/NAME` | Customer pages (unchanged) |
| `/admin.php` | Orders, pages, tap counts, QR codes (unchanged, now shows every item of a cart order) |

Old links such as `/order.html?product=stand&plan=plus` still work and put that product in the cart.

## 5. New in the store

- **Cart:** a customer can order a card and a stand together. All products in one order open the same page. Prices are always taken from `site-config.json` on the server.
- **InstaPay tap card:** a portrait purple NFC card whose tap opens the buyer's InstaPay payment link (QR on the back). One price, set in `site-config.json` under `"products" → "instapay" → "basic"` (200 EGP is a placeholder). If you upload an older `site-config.json` without the `instapay` line, the product hides itself. The site draws "InstaPay" as plain text, not InstaPay's official logo; printing their logo on cards you sell may need their permission.
- **Tap stands (square acrylic):** the stand is now drawn as a square acrylic plate. Six ready designs are sold as their own products at the Basic stand price (350 EGP): Google review, Instagram, Facebook, InstaPay, Vodafone Cash, Menu. Each is marked "fully customizable" (logo, colours, text). The design shows in admin as `look: google` etc. and preselects the link it opens in the order form. Designs live in `lib/stands.ts`. The site draws the brands as plain text and simple icons; printing the real Google/Instagram/Facebook/Vodafone/InstaPay logos on stands you sell may need those brands' permission.
- **Vodafone Cash link:** new link type `vfcash`. It has no payment link, so the customer page shows the wallet number with a copy button.
- **View my resume:** new link type `resume` (a CV link: Google Drive, PDF, LinkedIn). On a Plus page it appears right under Save contact with a highlighted border.
- **Buttons:** primary buttons use the shiny animated style (`.shiny-cta` in `app/globals.css`, also available as `components/ui/shiny-button.tsx`). The old gradient style is still there as `variant="grad"`.
- **Card look:** customers pick one of 9 looks (Midnight, Aurora, Pulse, Mesh, Holo, Circuit, Liquid, Nebula, Chrome). It shows in admin as `look: holo` etc. It is a preference: you still send the print preview on WhatsApp before printing.

## 6. Changing the site's code

The source is in `remotap-store-source.zip` (Next.js + TypeScript + Tailwind, shadcn structure, components in `components/ui`).

```
npm install
./assemble.sh          # builds and puts site + PHP together in ./dist → zip dist and upload
npm run build:preview  # one-page preview build used for the shareable link
```

## 7. Optional

- **Brand font:** Michroma stands in for Lastica. With a Lastica web licence, put `Lastica.woff2` in `assets/fonts/` and add an `@font-face` for "Lastica" at the top of `app/globals.css`, then rebuild.
- **Domain:** if it isn't remotap.com, replace `remotap.com` in `app/layout.tsx`, `public/robots.txt` and `public/sitemap.xml`, and rebuild.
- **Social links:** the footer has no Instagram/Facebook links yet. Send the account links and they go in.
