<?php
// Receives an order from order.html, prices it from site-config.json, stores it, emails the owner.
declare(strict_types=1);
require __DIR__ . '/../lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('method', 405);
if (!empty($_POST['website_hp'])) fail('spam');

// Basic flood protection: one order per IP every 20 seconds.
$ipKey = RT_DATA . '/orders/.ip-' . substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'rt'), 0, 16);
if (is_file($ipKey) && time() - filemtime($ipKey) < 20) fail('slow_down', 429);

$site = rt_site();
$product = $_POST['product'] ?? '';
$plan = $_POST['plan'] ?? '';
if (!isset($site['products'][$product][$plan])) fail('product');
$qty = max(1, min((int)($_POST['qty'] ?? 1), (int)($site['max_quantity'] ?? 20)));

$c_name = rt_clean($_POST['c_name'] ?? '', 80);
$c_phone = rt_clean($_POST['c_phone'] ?? '', 20);
$c_address = rt_clean($_POST['c_address'] ?? '', 300);
$area = in_array($_POST['c_area'] ?? '', $site['delivery_areas'] ?? ['cairo', 'giza'], true) ? $_POST['c_area'] : '';
$p_name = rt_clean($_POST['p_name'] ?? '', 60);
if ($c_name === '' || $c_address === '' || $p_name === '' || $area === '') fail('missing');
if (!preg_match('/^(\+?20|0)?1[0125]\d{8}$/', preg_replace('/[\s-]/', '', $c_phone) ?? '')) fail('phone');

$links = [];
if ($plan === 'basic') {
    $t = $_POST['one_type'] ?? '';
    $v = rt_clean($_POST['one_value'] ?? '', 300);
    if (in_array($t, RT_LINK_TYPES, true) && $v !== '') $links[] = ['type' => $t, 'value' => $v];
} else {
    foreach (RT_LINK_TYPES as $t) {
        $v = rt_clean($_POST["l_$t"] ?? '', 300);
        if ($v !== '') $links[] = ['type' => $t, 'value' => $v];
    }
}
if (!$links) fail('links');

$unit = (int)$site['products'][$product][$plan];
$delivery = (int)($site['delivery_fee'] ?? 0);
$total = $unit * $qty + $delivery;

// Store checkout: a cart with several lines. Every price is taken from site-config.json, never from the browser.
$items = [];
$raw = json_decode((string)($_POST['items'] ?? ''), true);
if (is_array($raw) && $raw) {
    $max = (int)($site['max_quantity'] ?? 20);
    foreach (array_slice($raw, 0, 10) as $it) {
        $ip = (string)($it['product'] ?? '');
        $ipl = (string)($it['plan'] ?? '');
        if (!isset($site['products'][$ip][$ipl])) fail('product');
        $iq = max(1, min((int)($it['qty'] ?? 1), $max));
        $items[] = [
            'product' => $ip,
            'plan' => $ipl,
            'qty' => $iq,
            'design' => preg_replace('/[^a-z0-9-]/', '', strtolower((string)($it['design'] ?? ''))) ?: '',
            'unit_price' => (int)$site['products'][$ip][$ipl],
        ];
    }
    $qty = array_sum(array_column($items, 'qty'));
    $total = array_sum(array_map(fn($i) => $i['unit_price'] * $i['qty'], $items)) + $delivery;
    // The page follows the best plan in the cart.
    $plan = in_array('plus', array_column($items, 'plan'), true) ? 'plus' : 'basic';
    if (!in_array($product, array_column($items, 'product'), true)) $product = $items[0]['product'];
}

do {
    $id = 'RT-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
} while (is_file(rt_order_path($id)));

$logo = isset($_FILES['logo']) ? rt_save_image($_FILES['logo']) : '';

$order = [
    'id' => $id,
    'created' => date('c'),
    'status' => 'awaiting_payment',
    'product' => $product,
    'plan' => $plan,
    'qty' => $qty,
    'unit_price' => $unit,
    'items' => $items,
    'delivery_fee' => $delivery,
    'total' => $total,
    'customer' => [
        'name' => $c_name,
        'phone' => $c_phone,
        'email' => rt_clean($_POST['c_email'] ?? '', 120),
        'area' => $area,
        'address' => $c_address,
        'notes' => rt_clean($_POST['c_notes'] ?? '', 300),
    ],
    'page' => [
        'name' => $p_name,
        'title' => rt_clean($_POST['p_title'] ?? '', 80),
        'bio' => rt_clean($_POST['p_bio'] ?? '', 220),
        'lang' => in_array($_POST['p_lang'] ?? '', ['en', 'ar', 'both'], true) ? $_POST['p_lang'] : (($_POST['lang'] ?? '') === 'ar' ? 'ar' : 'en'),
        'print_text' => rt_clean($_POST['print_text'] ?? '', 40),
        'logo' => $logo,
        'links' => $links,
    ],
    'source' => rt_clean($_POST['source'] ?? '', 60) ?: 'direct',
    'site_lang' => ($_POST['lang'] ?? '') === 'ar' ? 'ar' : 'en',
    'profile' => null,
];

rt_write_json(rt_order_path($id), $order);
touch($ipKey);

$to = (string)(rt_private()['notify_email'] ?? '');
if ($to !== '' && function_exists('mail')) {
    $lines = [
        "New RemoTap order $id",
        $items
            ? implode("\n", array_map(fn($i) => "{$i['product']} / {$i['plan']}" . ($i['design'] ? " ({$i['design']})" : '') . " x {$i['qty']}", $items)) . "\nTotal $total EGP (incl. $delivery delivery)"
            : "{$order['product']} / {$order['plan']} x $qty = $total EGP (incl. $delivery delivery)",
        "Customer: $c_name, $c_phone",
        "Address: $area, $c_address",
        "Page name: $p_name",
        'Came from: ' . $order['source'],
        '',
        'Open the admin page to confirm payment: ' . rt_base_url() . '/admin.php',
    ];
    @mail($to, "RemoTap order $id - $total EGP", implode("\n", $lines), "Content-Type: text/plain; charset=UTF-8");
}

echo json_encode(['ok' => true, 'id' => $id, 'total' => $total]);
