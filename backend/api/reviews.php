<?php
// Customer reviews for the home page.
// GET: approved reviews, newest first. POST: a visitor leaves a review; it waits in the admin until approved.
declare(strict_types=1);
require __DIR__ . '/../lib.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    header('Cache-Control: no-store');
    $fail = function (string $msg, int $code = 400): never {
        http_response_code($code);
        echo json_encode(['ok' => false, 'error' => $msg]);
        exit;
    };
    if (!empty($_POST['website_hp'])) $fail('spam');
    if (!rt_rate_ok('review', 3, 3600)) $fail('slow_down', 429);
    $name = rt_clean($_POST['name'] ?? '', 60);
    $text = rt_clean($_POST['text'] ?? '', 600);
    $rating = (int)($_POST['rating'] ?? 0);
    if ($name === '' || mb_strlen($text) < 5 || $rating < 1 || $rating > 5) $fail('missing');
    $all = rt_reviews();
    $all[] = [
        'id' => bin2hex(random_bytes(4)),
        'name' => $name,
        'role' => rt_clean($_POST['role'] ?? '', 80),
        'rating' => $rating,
        'text' => $text,
        'product' => '',
        'order_id' => '',
        'source' => 'Website',
        'shown' => false,
        'created' => date('Y-m-d'),
    ];
    rt_save_reviews($all);
    rt_notify("⭐ New review ($rating/5) from $name:\n$text\nApprove it: " . rt_base_url() . '/admin.php?tab=reviews');
    echo json_encode(['ok' => true]);
    exit;
}

header('Cache-Control: public, max-age=300');
$out = [];
foreach (array_reverse(rt_reviews()) as $r) {
    if (empty($r['shown'])) continue;
    $out[] = ['name' => $r['name'], 'role' => $r['role'] ?? '', 'rating' => (int)$r['rating'], 'text' => $r['text'], 'product' => $r['product'] ?? ''];
    if (count($out) === 12) break;
}
echo json_encode(['ok' => true, 'reviews' => $out], JSON_UNESCAPED_UNICODE);
