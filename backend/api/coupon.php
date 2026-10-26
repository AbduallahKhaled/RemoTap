<?php
// Checks a discount code for the checkout preview. The order API checks it again before saving.
declare(strict_types=1);
require __DIR__ . '/../lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$code = rt_coupon_code((string)($_GET['code'] ?? ''));
$subtotal = max(0, (int)($_GET['subtotal'] ?? 0));
[$discount, $err] = rt_coupon_check($code, $subtotal);
if ($err !== '') {
    $min = $err === 'min' ? (int)(rt_coupons()[$code]['min'] ?? 0) : 0;
    echo json_encode(['ok' => false, 'error' => $err, 'min' => $min]);
    exit;
}
$c = rt_coupons()[$code];
// The rule goes back too, so the checkout can follow cart changes without asking again.
echo json_encode(['ok' => true, 'code' => $code, 'discount' => $discount, 'type' => $c['type'], 'value' => (int)$c['value'], 'min' => (int)($c['min'] ?? 0)]);
