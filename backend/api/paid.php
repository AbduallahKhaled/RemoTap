<?php
// "I've sent the money": the customer marks their InstaPay transfer as sent from the thank-you page,
// optionally with a screenshot. The owner still confirms it in the admin.
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
if (!rt_rate_ok('paid', 8, 600)) fail('slow_down', 429);

$o = rt_order_for_customer((string)($_POST['id'] ?? ''), (string)($_POST['phone'] ?? ''));
if (!$o) fail('not_found', 404);
$p = rt_pay($o);
if ($p['status'] === 'confirmed') { echo json_encode(['ok' => true, 'status' => 'confirmed']); exit; }

$proof = isset($_FILES['proof']) ? rt_save_proof($_FILES['proof']) : '';
if (isset($_FILES['proof']) && ($_FILES['proof']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE && $proof === '') fail('image');
$p['status'] = 'sent';
$p['sent_at'] = date('c');
$p['by_customer'] = true;
if ($proof !== '') $p['proof'] = $proof;
$ref = rt_clean($_POST['ref'] ?? '', 60);
if ($ref !== '') $p['ref'] = $ref;
$o['payment'] = $p;
rt_write_json(rt_order_path($o['id']), $o);

rt_notify("💸 {$o['id']}: {$o['customer']['name']} says they sent {$p['amount']} EGP on InstaPay" . ($proof ? ' (screenshot attached in admin)' : '') . ".\nConfirm it: " . rt_base_url() . '/admin.php?tab=instapay');
echo json_encode(['ok' => true, 'status' => 'sent']);
