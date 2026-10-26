<?php
// Receives a "become a distributor" request and stores it for the admin's Distributor requests page.
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

$ipKey = RT_DATA . '/distributors/.ip-' . substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'rt'), 0, 16);
if (is_file($ipKey) && time() - filemtime($ipKey) < 60) fail('slow_down', 429);

$name = rt_clean($_POST['name'] ?? '', 80);
$phone = rt_clean($_POST['phone'] ?? '', 20);
if ($name === '') fail('missing');
if (!preg_match('/^(\+?20|0)?1[0125]\d{8}$/', preg_replace('/[\s-]/', '', $phone) ?? '')) fail('phone');

do {
    $id = 'DS-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
} while (is_file(rt_dist_path($id)));

$req = [
    'id' => $id,
    'created' => date('c'),
    'status' => 'new',
    'name' => $name,
    'company' => rt_clean($_POST['company'] ?? '', 100),
    'phone' => $phone,
    'email' => rt_clean($_POST['email'] ?? '', 120),
    'city' => rt_clean($_POST['city'] ?? '', 60),
    'kind' => rt_clean($_POST['kind'] ?? '', 60),
    'volume' => rt_clean($_POST['volume'] ?? '', 60),
    'message' => rt_clean($_POST['message'] ?? '', 600),
    'note' => '',
];
if (!is_dir(RT_DATA . '/distributors')) mkdir(RT_DATA . '/distributors', 0755, true);
rt_write_json(rt_dist_path($id), $req);
touch($ipKey);
rt_notify("🤝 Distributor request from $name" . ($req['company'] ? " ({$req['company']})" : '') . ", $phone" . ($req['city'] ? ", {$req['city']}" : '') . "
" . rt_base_url() . '/admin.php?tab=distributors');
echo json_encode(['ok' => true, 'id' => $id]);
