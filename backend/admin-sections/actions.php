<?php
// Admin form actions for the store sections: InstaPay, shipping, inventory, discount codes, reviews, distributors.
// Included by admin.php inside its POST block, after the login and CSRF checks. $action is set there.
declare(strict_types=1);
if (!defined('RT_ADMIN')) { http_response_code(403); exit; }

$back = in_array($_POST['back'] ?? '', array_keys(ADM_MENU), true) ? $_POST['back'] : 'orders';

/* ---------- InstaPay ---------- */
if (in_array($action, ['pay_confirm', 'pay_sent', 'pay_reject', 'pay_reset'], true)) {
    $id = (string)($_POST['id'] ?? '');
    $o = adm_order($id);
    if (!$o) go("tab=$back", 'Order not found.');
    $p = rt_pay($o);
    $ref = rt_clean($_POST['ref'] ?? '', 60);
    if ($ref !== '') $p['ref'] = $ref;
    $note = rt_clean($_POST['note'] ?? '', 200);
    if ($note !== '') $p['note'] = $note;
    if ($action === 'pay_confirm') {
        $p['status'] = 'confirmed';
        $p['confirmed_at'] = date('c');
        $o['payment'] = $p;
        if ($o['status'] === 'awaiting_payment') adm_set_status($o, 'paid');
        $msg = "Transfer for $id confirmed. The order is now paid.";
    } elseif ($action === 'pay_sent') {
        $p['status'] = 'sent';
        $p['sent_at'] = date('c');
        $o['payment'] = $p;
        $msg = "Order $id: customer says the transfer was sent. Check InstaPay, then confirm it.";
    } elseif ($action === 'pay_reject') {
        $p['status'] = 'rejected';
        $p['rejected_at'] = date('c');
        $o['payment'] = $p;
        $msg = "Transfer for $id rejected. The order stays unpaid.";
    } else {
        $p['status'] = 'awaiting';
        $o['payment'] = $p;
        $msg = "Order $id is waiting for its transfer again.";
    }
    rt_write_json(rt_order_path($id), $o);
    go("tab=$back#$id", $msg);
}

/* ---------- Shipping ---------- */
if ($action === 'ship' || $action === 'deliver') {
    $id = (string)($_POST['id'] ?? '');
    $o = adm_order($id);
    if (!$o) go('tab=shipping', 'Order not found.');
    if ($action === 'ship') {
        $courier = rt_clean($_POST['courier'] ?? '', 40);
        if ($courier === '') go("tab=shipping#$id", 'Pick the courier first.');
        $o['shipping']['courier'] = $courier;
        $o['shipping']['tracking'] = rt_clean($_POST['tracking'] ?? '', 60);
        adm_set_status($o, 'shipped');
        $msg = "Order $id marked shipped with $courier.";
    } else {
        adm_set_status($o, 'delivered');
        $msg = "Order $id marked delivered.";
    }
    rt_write_json(rt_order_path($id), $o);
    go("tab=shipping#$id", $msg);
}

/* ---------- Inventory ---------- */
if ($action === 'save_stock') {
    $stock = rt_stock();
    foreach (rt_stock_items() as $k => $label) {
        foreach (['qty', 'min'] as $f) {
            $v = trim((string)($_POST[$f][$k] ?? ''));
            if (!preg_match('/^-?\d{1,6}$/', $v)) go('tab=inventory', "$label: write whole numbers only.");
            $stock[$k][$f] = (int)$v;
        }
    }
    rt_write_json(RT_DATA . '/stock.json', $stock);
    go('tab=inventory', 'Stock saved.');
}

if ($action === 'stock_add') {
    $label = rt_clean($_POST['label'] ?? '', 60);
    if ($label === '') go('tab=inventory', 'Write the item name.');
    $custom = rt_read_json(RT_DATA . '/stock-items.json') ?? [];
    $key = 'x_' . (preg_replace('/[^a-z0-9]+/', '_', strtolower($label)) ?: bin2hex(random_bytes(3)));
    if (isset(rt_stock_items()[$key])) go('tab=inventory', "$label is already on the list.");
    $custom[$key] = $label;
    rt_write_json(RT_DATA . '/stock-items.json', $custom);
    go('tab=inventory', "$label added. Write how many you have, then save.");
}
if ($action === 'stock_remove') {
    $key = (string)($_POST['key'] ?? '');
    $custom = rt_read_json(RT_DATA . '/stock-items.json') ?? [];
    if (!isset($custom[$key])) go('tab=inventory', 'Only items you added can be removed.');
    $label = $custom[$key];
    unset($custom[$key]);
    rt_write_json(RT_DATA . '/stock-items.json', $custom);
    go('tab=inventory', "$label removed.");
}

/* ---------- Telegram alerts ---------- */
if ($action === 'save_notify' || $action === 'notify_test') {
    $n = rt_read_json(RT_DATA . '/notify.json') ?? [];
    if (!empty($_POST['off'])) {
        rt_write_json(RT_DATA . '/notify.json', []);
        go('tab=settings', 'Telegram alerts turned off.');
    }
    $tok = trim((string)($_POST['telegram_token'] ?? ''));
    if ($tok !== '') {
        if (!preg_match('/^\d{5,15}:[A-Za-z0-9_-]{20,60}$/', $tok)) go('tab=settings', 'That bot token does not look right. Copy it again from @BotFather.');
        $n['telegram_token'] = $tok;
    }
    $chat = trim((string)($_POST['telegram_chat'] ?? ''));
    if (!preg_match('/^-?\d{4,20}$/', $chat)) go('tab=settings', 'The chat id is a number. Get it from @userinfobot.');
    $n['telegram_chat'] = $chat;
    if (empty($n['telegram_token'])) go('tab=settings', 'Paste the bot token first.');
    rt_write_json(RT_DATA . '/notify.json', $n);
    if ($action === 'notify_test') {
        go('tab=settings', rt_notify('✅ RemoTap alerts work. New orders will show up here.') ? 'Test message sent. Check Telegram.' : 'Telegram did not accept it. Check the token and chat id, and press Start in your bot first.');
    }
    go('tab=settings', 'Alerts saved. Press “Send test message” to check them.');
}

/* ---------- Extra services (price and visibility on the site's Services page) ---------- */
if ($action === 'save_services') {
    $site = rt_site();
    $out = [];
    foreach (RT_SERVICES as $k => $label) {
        $v = trim((string)($_POST['price'][$k] ?? ''));
        if ($v !== '' && !preg_match('/^\d{1,6}$/', $v)) go('tab=services', "$label: the price must be a whole number of EGP, or empty for \"Price on request\".");
        $out[$k] = ['price' => $v === '' ? null : (int)$v, 'show' => !empty($_POST['show'][$k])];
    }
    $site['services'] = $out;
    rt_save_site($site);
    go('tab=services', 'Services saved. The Services page on the site uses them on the next page load.');
}

/* ---------- Discount codes ---------- */
if ($action === 'coupon_save') {
    $code = rt_coupon_code((string)($_POST['code'] ?? ''));
    if ($code === '' || strlen($code) > 30) go('tab=coupons', 'The code can use letters, numbers, - and _ (up to 30).');
    $all = rt_coupons();
    $orig = rt_coupon_code((string)($_POST['orig'] ?? ''));
    if ($code !== $orig && isset($all[$code])) go('tab=coupons', "The code $code already exists.");
    $type = ($_POST['type'] ?? '') === 'fixed' ? 'fixed' : 'percent';
    $value = (int)($_POST['value'] ?? 0);
    if ($value < 1 || ($type === 'percent' && $value > 100)) go('tab=coupons', $type === 'percent' ? 'Percent must be 1 to 100.' : 'Amount must be at least 1 EGP.');
    $expires = (string)($_POST['expires'] ?? '');
    if ($expires !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expires)) $expires = '';
    $old = $all[$orig] ?? [];
    if ($orig !== '' && $orig !== $code) unset($all[$orig]);
    $all[$code] = [
        'type' => $type,
        'value' => $value,
        'min' => max(0, (int)($_POST['min'] ?? 0)),
        'expires' => $expires,
        'max_uses' => max(0, (int)($_POST['max_uses'] ?? 0)),
        'used' => (int)($old['used'] ?? 0),
        'active' => !empty($_POST['active']),
        'note' => rt_clean($_POST['note'] ?? '', 120),
        'created' => $old['created'] ?? date('Y-m-d'),
    ];
    rt_save_coupons($all);
    go('tab=coupons', "Code $code saved.");
}
if ($action === 'coupon_toggle' || $action === 'coupon_delete') {
    $all = rt_coupons();
    $code = rt_coupon_code((string)($_POST['code'] ?? ''));
    if (!isset($all[$code])) go('tab=coupons', 'Code not found.');
    if ($action === 'coupon_delete') { unset($all[$code]); $msg = "Code $code deleted."; }
    else { $all[$code]['active'] = empty($all[$code]['active']); $msg = "Code $code " . ($all[$code]['active'] ? 'turned on.' : 'turned off.'); }
    rt_save_coupons($all);
    go('tab=coupons', $msg);
}

/* ---------- Reviews ---------- */
if ($action === 'review_save') {
    $name = rt_clean($_POST['name'] ?? '', 60);
    $text = rt_clean($_POST['text'] ?? '', 600);
    if ($name === '' || $text === '') go('tab=reviews', 'Write the customer name and what they said.');
    $all = rt_reviews();
    $all[] = [
        'id' => bin2hex(random_bytes(4)),
        'name' => $name,
        'role' => rt_clean($_POST['role'] ?? '', 80),
        'rating' => max(1, min(5, (int)($_POST['rating'] ?? 5))),
        'text' => $text,
        'product' => isset(RT_CATALOG[$_POST['product'] ?? '']) ? $_POST['product'] : '',
        'order_id' => preg_match('/^RT-[0-9]{6}-[A-Z0-9]{4}$/', (string)($_POST['order_id'] ?? '')) ? $_POST['order_id'] : '',
        'source' => rt_clean($_POST['source'] ?? '', 40),
        'shown' => !empty($_POST['shown']),
        'created' => date('Y-m-d'),
    ];
    rt_save_reviews($all);
    go('tab=reviews', 'Review saved.');
}
if ($action === 'review_toggle' || $action === 'review_delete') {
    $id = (string)($_POST['id'] ?? '');
    $all = rt_reviews();
    $found = false;
    foreach ($all as $k => $r) {
        if (($r['id'] ?? '') !== $id) continue;
        $found = true;
        if ($action === 'review_delete') unset($all[$k]);
        else $all[$k]['shown'] = empty($r['shown']);
    }
    if (!$found) go('tab=reviews', 'Review not found.');
    rt_save_reviews($all);
    go('tab=reviews', $action === 'review_delete' ? 'Review deleted.' : 'Review updated.');
}

/* ---------- Distributor requests ---------- */
if ($action === 'dist_save') {
    $id = (string)($_POST['id'] ?? '');
    $d = preg_match('/^DS-[0-9]{6}-[A-Z0-9]{4}$/', $id) ? rt_read_json(rt_dist_path($id)) : null;
    if (!$d) go('tab=distributors', 'Request not found.');
    $st = (string)($_POST['status'] ?? '');
    if (isset(RT_DIST_STATUSES[$st])) $d['status'] = $st;
    $d['note'] = rt_clean($_POST['note'] ?? '', 300);
    $d['updated'] = date('c');
    rt_write_json(rt_dist_path($id), $d);
    go("tab=distributors#$id", "Request from {$d['name']} saved.");
}
