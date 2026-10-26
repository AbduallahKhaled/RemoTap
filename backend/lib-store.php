<?php
// RemoTap store data beyond orders and pages: InstaPay payment status, discount codes, stock,
// reviews and distributor requests. Plain JSON files in data/, no database. Loaded by lib.php.
declare(strict_types=1);

/* ---------- InstaPay payment status (per order) ---------- */
const RT_PAY_STATUSES = [
    'awaiting' => 'Awaiting transfer',
    'sent' => 'Customer says sent',
    'confirmed' => 'Confirmed',
    'rejected' => 'Rejected',
];

/** Payment block of an order. Older orders have none: derive it from the order status. */
function rt_pay(array $o): array {
    if (!empty($o['payment']['status'])) return $o['payment'];
    $paid = !in_array($o['status'] ?? '', ['awaiting_payment', 'cancelled'], true);
    return ['method' => 'instapay', 'status' => $paid ? 'confirmed' : 'awaiting', 'amount' => (int)($o['total'] ?? 0)];
}

/* ---------- Discount codes ---------- */
/** data/coupons.json: CODE => {type: percent|fixed, value, min, expires (Y-m-d or ''), max_uses (0 = no limit), used, active, note, created} */
function rt_coupons(): array { return rt_read_json(RT_DATA . '/coupons.json') ?? []; }
function rt_save_coupons(array $c): void { ksort($c); rt_write_json(RT_DATA . '/coupons.json', $c); }
function rt_coupon_code(string $s): string { return strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', $s) ?? ''); }

/** Discount in EGP for a code on a products subtotal (before delivery). Returns [discount, error code or '']. */
function rt_coupon_check(string $code, int $subtotal): array {
    $code = rt_coupon_code($code);
    if ($code === '') return [0, 'empty'];
    $c = rt_coupons()[$code] ?? null;
    if (!$c || empty($c['active'])) return [0, 'invalid'];
    if (!empty($c['expires']) && $c['expires'] < date('Y-m-d')) return [0, 'expired'];
    if (!empty($c['max_uses']) && (int)($c['used'] ?? 0) >= (int)$c['max_uses']) return [0, 'used_up'];
    if ($subtotal < (int)($c['min'] ?? 0)) return [0, 'min'];
    $d = $c['type'] === 'percent'
        ? (int)floor($subtotal * min(100, max(0, (int)$c['value'])) / 100)
        : min($subtotal, max(0, (int)$c['value']));
    return [$d, ''];
}

function rt_coupon_use(string $code): void {
    $all = rt_coupons();
    $code = rt_coupon_code($code);
    if (!isset($all[$code])) return;
    $all[$code]['used'] = (int)($all[$code]['used'] ?? 0) + 1;
    rt_save_coupons($all);
}

/* ---------- Stock (blank materials; every product is made to order) ---------- */
const RT_STOCK_ITEMS = [
    'nfc_chips' => 'NFC chips',
    'card_blank' => 'Blank NFC cards',
    'pvc_card' => 'PVC NFC cards',
    'metal_card' => 'Metal NFC cards',
    'wood_card' => 'Wood NFC cards',
    'stand_small' => 'Acrylic stands 10x15 cm',
    'stand_large' => 'Acrylic stands 15x20 cm',
    'coaster_small' => 'Coasters 9x9 cm',
    'coaster_large' => 'Coasters 12x12 cm',
    'pay_card' => 'Payment tap cards (InstaPay / Vodafone Cash)',
];

/** data/stock.json: key => {qty, min}. Missing items start at 0 with a low-stock line of 10. */
function rt_stock(): array {
    $s = rt_read_json(RT_DATA . '/stock.json') ?? [];
    $out = [];
    foreach (rt_stock_items() as $k => $label) $out[$k] = ['qty' => (int)($s[$k]['qty'] ?? 0), 'min' => (int)($s[$k]['min'] ?? 10)];
    return $out;
}

/** Stock item used by one piece of an order line (every piece also uses one NFC chip). */
function rt_stock_key(string $product, string $plan, string $design = ''): string {
    return match ($product) {
        'card' => match (rt_card_type($design)) { 'metal' => 'metal_card', 'wood' => 'wood_card', 'blank' => 'card_blank', default => 'pvc_card' },
        'stand' => $plan === 'plus' ? 'stand_large' : 'stand_small',
        'coaster' => $plan === 'plus' ? 'coaster_large' : 'coaster_small',
        'instapay', 'vfcash' => 'pay_card',
        default => 'card_blank',
    };
}

/** Pieces needed by paid orders that are not made yet (paid or printing), per stock item. */
function rt_stock_reserved(array $orders): array {
    $need = array_fill_keys(array_keys(rt_stock_items()), 0);
    foreach ($orders as $o) {
        if (!in_array($o['status'] ?? '', ['paid', 'printing'], true)) continue;
        foreach ($o['items'] ?? [] as $i) {
            $q = (int)($i['qty'] ?? 0);
            $need[rt_stock_key((string)$i['product'], (string)$i['plan'], (string)($i['design'] ?? ''))] += $q;
            $need['nfc_chips'] += $q;
        }
    }
    return $need;
}

/* ---------- Reviews (real customer reviews entered or approved by the owner) ---------- */
/** data/reviews.json: list of {id, name, role, rating 1-5, text, product, source, shown, created} */
function rt_reviews(): array { return rt_read_json(RT_DATA . '/reviews.json') ?? []; }
function rt_save_reviews(array $r): void { rt_write_json(RT_DATA . '/reviews.json', array_values($r)); }

/* ---------- Distributor (reseller) requests ---------- */
const RT_DIST_STATUSES = [
    'new' => 'New',
    'contacted' => 'Contacted',
    'approved' => 'Approved',
    'rejected' => 'Rejected',
];
function rt_dist_path(string $id): string { return RT_DATA . "/distributors/$id.json"; }

/* ---------- Custom stock items (added in the admin on top of RT_STOCK_ITEMS) ---------- */
/** data/stock-items.json: key => label. These are counted by hand; only the built-in items follow shipped orders. */
function rt_stock_items(): array {
    return RT_STOCK_ITEMS + (rt_read_json(RT_DATA . '/stock-items.json') ?? []);
}

/* ---------- Telegram alerts (new orders, "I paid", distributor requests) ---------- */
/** data/notify.json: {telegram_token, telegram_chat}. Returns true when Telegram accepted the message. */
function rt_notify(string $text): bool {
    $n = rt_read_json(RT_DATA . '/notify.json') ?? [];
    $token = (string)($n['telegram_token'] ?? '');
    $chat = (string)($n['telegram_chat'] ?? '');
    if ($token === '' || $chat === '') return false;
    $url = 'https://api.telegram.org/bot' . $token . '/sendMessage';
    $body = http_build_query(['chat_id' => $chat, 'text' => $text, 'disable_web_page_preview' => 'true']);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5]);
        $res = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => 'Content-Type: application/x-www-form-urlencoded', 'content' => $body, 'timeout' => 5, 'ignore_errors' => true]]);
        $res = @file_get_contents($url, false, $ctx);
    }
    return is_string($res) && str_contains($res, '"ok":true');
}

/* ---------- Payment screenshots (private: data/proofs, shown only in the admin) ---------- */
function rt_save_proof(array $file): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return '';
    if (($file['size'] ?? 0) > 6 * 1024 * 1024) return '';
    $info = @getimagesize($file['tmp_name']);
    $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2] ?? 0] ?? null;
    if (!$ext) return '';
    $dir = RT_DATA . '/proofs';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $name = date('Ymd') . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
    return move_uploaded_file($file['tmp_name'], "$dir/$name") ? $name : '';
}

/** The order a customer may see: order number plus the phone it was placed with. */
function rt_order_for_customer(string $id, string $phone): ?array {
    $id = strtoupper(trim($id));
    if (!preg_match('/^RT-[0-9]{6}-[A-Z0-9]{4}$/', $id)) return null;
    $o = rt_read_json(rt_order_path($id));
    if (!$o || rt_eg_phone($phone) === '' || rt_eg_phone($phone) !== rt_eg_phone((string)$o['customer']['phone'])) return null;
    return $o;
}

/** Simple per-IP limit for the public endpoints: at most $max hits per $seconds. */
function rt_rate_ok(string $bucket, int $max, int $seconds): bool {
    $f = RT_DATA . '/limits/' . $bucket . '-' . substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'rt'), 0, 16) . '.json';
    $hits = array_values(array_filter(rt_read_json($f) ?? [], fn($t) => $t > time() - $seconds));
    if (count($hits) >= $max) return false;
    $hits[] = time();
    rt_write_json($f, $hits);
    return true;
}

/* ---------- Data backups ---------- */
/** Zip of everything in data/ except backups, limits and the admin password. Returns the zip path or ''. */
function rt_backup_zip(string $path): string {
    if (!class_exists('ZipArchive')) return '';
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) return '';
    $base = realpath(RT_DATA);
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $file) {
        $rel = str_replace(DIRECTORY_SEPARATOR, '/', substr($file->getPathname(), strlen($base) + 1));
        if (preg_match('#^(backups|limits)/|^admin\.json$|^login-fails\.json$|\.tmp$|/\.ip-#', $rel)) continue;
        $zip->addFile($file->getPathname(), $rel);
    }
    $zip->addFile(RT_ROOT . '/site-config.json', 'site-config.json');
    $zip->close();
    return is_file($path) ? $path : '';
}

/** One backup a day in data/backups/data-YYYYMMDD.zip, keeping the last 14. Called when the admin opens. */
function rt_backup_daily(): void {
    $dir = RT_DATA . '/backups';
    $path = "$dir/data-" . date('Ymd') . '.zip';
    if (is_file($path)) return;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (rt_backup_zip($path) === '') return;
    $all = glob("$dir/data-*.zip") ?: [];
    sort($all);
    foreach (array_slice($all, 0, max(0, count($all) - 14)) as $old) @unlink($old);
}

/* ---------- Extra services (shown on the site's Services page; prices edited in the admin) ---------- */
/** Keep keys in sync with SERVICES in lib/store.ts. */
const RT_SERVICES = [
    'review_filter' => 'Review filter',
    'landing_page' => 'Custom landing page (+ Google Analytics)',
    'website' => 'Custom website',
];
