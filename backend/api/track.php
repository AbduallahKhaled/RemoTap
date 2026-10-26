<?php
// Order tracking for customers: order number + the phone used at checkout.
declare(strict_types=1);
require __DIR__ . '/../lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (!rt_rate_ok('track', 30, 600)) { http_response_code(429); echo json_encode(['ok' => false, 'error' => 'slow_down']); exit; }
$o = rt_order_for_customer((string)($_REQUEST['id'] ?? ''), (string)($_REQUEST['phone'] ?? ''));
if (!$o) { usleep(300000); http_response_code(404); echo json_encode(['ok' => false, 'error' => 'not_found']); exit; }

$s = $o['shipping'] ?? [];
$hist = [];
foreach ($o['history'] ?? [] as $h) $hist[$h['status']] ??= $h['at'];
echo json_encode([
    'ok' => true,
    'id' => $o['id'],
    'created' => $o['created'],
    'status' => $o['status'],
    'payment' => rt_pay($o)['status'],
    'total' => (int)$o['total'],
    'items' => array_map(fn($i) => ['product' => $i['product'], 'plan' => $i['plan'], 'qty' => (int)$i['qty']], !empty($o['items']) ? $o['items'] : [['product' => $o['product'], 'plan' => $o['plan'], 'qty' => $o['qty']]]),
    'courier' => (string)($s['courier'] ?? ''),
    'tracking' => (string)($s['tracking'] ?? ''),
    'dates' => [
        'paid' => rt_pay($o)['confirmed_at'] ?? ($hist['paid'] ?? null),
        'printing' => $hist['printing'] ?? null,
        'shipped' => $s['shipped_at'] ?? null,
        'delivered' => $s['delivered_at'] ?? null,
    ],
]);
