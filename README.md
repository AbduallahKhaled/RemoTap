# RemoTap store

NFC cards, stands, coasters and InstaPay / Vodafone Cash tap cards, made in Cairo and delivered all over Egypt.

The site is a Next.js static export (the store) plus a small PHP backend (orders, admin page, customer pages at `/p/NAME`). It runs on any shared host with PHP 8.1+ and cPanel or hPanel, such as Namecheap or Hostinger. No database needed.

## Before the first launch

Edit `public/site-config.json`:

| Field | What to put |
|---|---|
| `whatsapp` | Your WhatsApp number, international format without `+`, e.g. `2011xxxxxxxx` |
| `instapay_handle` | Your real InstaPay address, e.g. `name@instapay` |
| `instapay_number` | The phone number linked to your InstaPay |
| `instapay_link` | Optional InstaPay payment link (`ipn.eg/...`) |
| `delivery_fee` / `delivery_fee_other` | Delivery for Cairo and Giza / other governorates |
| `products`, `extra_price` | Prices (stand and coaster: `basic` = small size, `plus` = large) |
| `home.new`, `home.best` | Products shown in New arrivals / Best sellers on the home page |

The package command refuses to build while `instapay_handle` or `instapay_number` are still placeholders, because checkout shows them to customers as where to send money.

Optional: in `backend/private/config.php`, set `notify_email` to get an email for every new order.

## Build the upload package

```
npm install
npm run package -- --domain=yourdomain.com
```

This makes `remotap-upload.zip` (and `dist/`). The domain is written into the sitemap, robots.txt, search-engine tags and the PHP config.

## Put it live (Namecheap shared hosting, or any cPanel host)

1. Buy shared hosting with PHP (on Namecheap: a Stellar plan, not EasyWP) and connect your domain.
2. cPanel → **Select PHP Version**: 8.1 or newer, and tick **mbstring**.
3. cPanel → **File Manager** → `public_html`: upload `remotap-upload.zip`, right-click → **Extract**, then delete the zip. `index.html` and `.htaccess` must sit directly in `public_html`.
4. cPanel → **SSL Status**: run AutoSSL. The site redirects to https on its own.
5. Open `https://yourdomain.com/admin.php` **right away** and set the admin password. The first person to open it sets it.
6. Test on your phone: home page, `/shop`, `/p/demo`, and one order.

### Updating a live site

Run `npm run package -- --domain=yourdomain.com` again and upload the new zip the same way. **Keep the server's `data` folder:** it holds orders, customer pages, tap counts and the admin password. Download a copy before uploading, and never delete it.

Prices, WhatsApp and InstaPay details can also be changed directly in `site-config.json` on the server. The store reads it on every visit, so no rebuild is needed.

## What's where

| Address | What it is |
|---|---|
| `/` | Home: hero card, new arrivals, all products, best sellers |
| `/shop` | All products with filters: `?type=cards`, `stands`, `payment` |
| `/product/card` … `/product/vfcash` | Product pages |
| `/pricing`, `/how`, `/faq`, `/demo`, `/for`, `/why` | Info pages |
| `/order` | Checkout: cart, page details, delivery, review, then InstaPay + WhatsApp |
| `/p/NAME` | Customer pages (PHP) |
| `/admin.php` | Orders, customer pages, tap counts, QR codes |

## Develop

```
npm run dev        # http://localhost:3000 (the PHP parts, /p/ and orders, need a PHP host)
npm run lint
```

Code map: prices and products `lib/store.ts`; copy (English and Arabic) `lib/dict.ts` and `lib/dict-base.ts`; product photos `public/assets/img/products/`; server-side pricing `backend/api/order.php` and `backend/lib.php`.
